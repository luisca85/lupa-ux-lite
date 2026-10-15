// Migración del modelo v1 (imágenes dentro del hallazgo) al v2 (Pantalla como entidad).
// Solo en modo servidor: siembra datos v1 directamente por la API.
import { test, expect } from "@playwright/test";
import { makePng } from "./png.mjs";

const url = (buf) => "data:image/png;base64," + buf.toString("base64");

test("migración v1 → v2: pantallas, pines atómicos y nada se pierde", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "servidor", "siembra datos por la API");
  const sid = "mig" + Date.now();
  const put = (path, data) => request.put(`/api/doc?path=${encodeURIComponent(path)}`, { data });
  const get = async (path) => (await (await request.get(`/api/doc?path=${encodeURIComponent(path)}`)).json());
  const coll = async (path) => (await (await request.get(`/api/collection?path=${encodeURIComponent(path)}`)).json()).docs;
  const A = url(makePng(640, 400)), B = url(makePng(320, 200));

  await put(`estudios/${sid}`, { nombre: "Migración v1 " + sid, cliente: "Test", plataforma: "Sitio web", estado: "En curso", createdAt: Date.now() });
  // h1: una imagen con dos pines con comentario + catálogo v1
  await put(`estudios/${sid}/hallazgos/h1`, { tipo: "Problema", severidad: 3, titulo: "Uno", descripcion: "Desc uno", heuristicas: ["nn1"], sesgos: ["s-hick"], createdAt: 1, imgs: [{ id: "i1", thumb: A, w: 640, h: 400 }] });
  await put(`estudios/${sid}/hallazgos/h1/imgs/i1`, { full: A, w: 640, h: 400, ann: [{ t: "pin", x: 320, y: 200, n: 1, comment: "primer pin" }, { t: "pin", x: 64, y: 40, n: 2, comment: "segundo pin" }] });
  // h2: dos imágenes; la primera es igual a la de h1 (se deduplica), la segunda es otra
  await put(`estudios/${sid}/hallazgos/h2`, { tipo: "Oportunidad", severidad: 1, titulo: "Dos", createdAt: 2, interaccionId: "n1", flujoId: "f1", imgs: [{ id: "i2", thumb: A, w: 640, h: 400 }, { id: "i3", thumb: B, w: 320, h: 200 }] });
  await put(`estudios/${sid}/hallazgos/h2/imgs/i2`, { full: A, w: 640, h: 400, ann: [] });
  await put(`estudios/${sid}/hallazgos/h2/imgs/i3`, { full: B, w: 320, h: 200, ann: [] });
  // h3: sin imagen (observación general)
  await put(`estudios/${sid}/hallazgos/h3`, { tipo: "Observación", titulo: "Tres", createdAt: 3 });

  await page.goto("/");
  await page.getByRole("heading", { name: "Migración v1 " + sid }).click();
  await expect(page.getByText("Estudio actualizado: 2 pantallas creadas")).toBeVisible();

  const pantallas = await coll(`estudios/${sid}/pantallas`);
  expect(pantallas.length).toBe(2);
  const pA = pantallas.find((p) => p.data.w === 640), pB = pantallas.find((p) => p.data.w === 320);
  const hz = Object.fromEntries((await coll(`estudios/${sid}/hallazgos`)).map((d) => [d.id, d.data]));
  expect(Object.keys(hz).length).toBe(5); // h1, h2, h3 + observación del 2.º pin + copia de h2 en la 2.ª imagen
  expect(hz.h1.pantallaId).toBe(pA.id);
  expect(hz.h1.pin).toEqual({ x: 0.5, y: 0.5 });
  expect(hz.h1.catalogoIds).toEqual(["nn1", "s-hick"]);
  expect(hz.h1.descripcion).toContain("primer pin");
  expect(hz.h2.pantallaId).toBe(pA.id);            // deduplicada con la de h1
  expect(hz.h2.pasoId).toBe("n1");
  expect(hz.h3.pantallaId).toBeNull();
  expect(hz.h3.pin).toBeNull();
  const extra = Object.values(hz).filter((h) => !["Uno", "Dos", "Tres"].includes(h.titulo) || h.copiaDe);
  expect(extra.some((h) => h.tipo === "Observación" && h.descripcion === "segundo pin" && h.pantallaId === pA.id)).toBe(true);
  expect(extra.some((h) => h.copiaDe === "h2" && h.pantallaId === pB.id)).toBe(true);
  // No destructiva: las imágenes v1 siguen guardadas y el estudio queda en modelo 2
  expect((await get(`estudios/${sid}/hallazgos/h1/imgs/i1`)).exists).toBe(true);
  expect((await get(`estudios/${sid}`)).data.modelo).toBe(2);
  // Idempotente: abrir de nuevo no duplica
  await page.reload();
  await page.getByRole("heading", { name: "Migración v1 " + sid }).click();
  await expect(page.getByRole("heading", { name: "Resumen de problemas" })).toBeVisible();
  expect((await coll(`estudios/${sid}/pantallas`)).length).toBe(2);
  expect((await coll(`estudios/${sid}/hallazgos`)).length).toBe(5);
});
