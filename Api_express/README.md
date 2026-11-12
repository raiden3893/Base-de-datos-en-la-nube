# Actividad 3.2 — API Express de CLAUDENT

La API usa `express`, `pg` y `dotenv` para realizar las cuatro operaciones solicitadas en el PDF sobre `public.paciente`.

## Dato pendiente de Supabase

La sección **Server / Build APIs** no muestra el host PostgreSQL. En la ventana **Connect to your project**:

1. Haz clic en **Direct — Connection string**.
2. Selecciona **Session pooler**.
3. Copia el valor de **Host** de la cadena mostrada.
4. Colócalo en `DB_HOST` dentro de `.env`.
5. Confirma también el puerto y usuario mostrados por esa misma cadena.

No necesitas instalar `@supabase/server`, `@supabase/supabase-js` ni usar `SUPABASE_SECRET_KEY` para esta actividad.

La conexión utiliza `certs/prod-ca-2021.crt`, la autoridad pública de Supabase, y conserva activa la verificación TLS.

## Ejecutar

```powershell
cd Api_express
npm.cmd install
npm.cmd start
```

El servidor solo inicia después de comprobar la conexión PostgreSQL y queda disponible en `http://127.0.0.1:3000`.

## Probar en Postman

Importa `pruebas/CLAUDENT.postman_collection.json` y ejecuta, en orden:

1. POST — insertar paciente ficticio.
2. GET — consultar por apellido.
3. PATCH — actualizar usando el ID guardado por el POST.
4. DELETE — eliminar ese mismo paciente ficticio.

La colección guarda automáticamente el ID real como `pacienteId`. Toma una captura de cada respuesta mostrando método, URL, estado HTTP y cuerpo JSON.
