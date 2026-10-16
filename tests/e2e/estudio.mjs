// Alta de estudio desde la home: formulario en dos pasos dentro del bloque de Estudios.
export async function crearEstudio(page, nombre) {
  await page.locator("#newStudy").click();
  await page.getByPlaceholder("Ej: Onboarding app de ahorro").fill(nombre);
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await page.getByRole("button", { name: "Crear estudio" }).click();
}
