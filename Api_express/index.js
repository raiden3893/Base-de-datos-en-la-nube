import express from 'express';
import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'node:fs';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1';

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Faltan variables de entorno: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: readFileSync(new URL('./certs/prod-ca-2021.crt', import.meta.url), 'utf8'),
    rejectUnauthorized: true
  }
});

app.use(express.json());

const camposPaciente = [
  'nombre',
  'apellido',
  'fecha_nacimiento',
  'telefono',
  'correo',
  'direccion'
];

function esCorreoDePrueba(correo) {
  return typeof correo === 'string' && /^[^\s@]+@example\.test$/i.test(correo);
}

function idValido(id) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

// 1. Insertar un paciente ficticio.
app.post('/api/pacientes', async (req, res, next) => {
  try {
    const faltantes = camposPaciente.filter(
      (campo) => req.body[campo] === undefined || req.body[campo] === ''
    );

    if (faltantes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Faltan campos obligatorios: ${faltantes.join(', ')}`
      });
    }

    if (!esCorreoDePrueba(req.body.correo)) {
      return res.status(400).json({
        success: false,
        message: 'El correo de prueba debe terminar en @example.test'
      });
    }

    const resultado = await pool.query(
      `INSERT INTO public.paciente
        (nombre, apellido, fecha_nacimiento, telefono, correo, direccion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.body.nombre.trim(),
        req.body.apellido.trim(),
        req.body.fecha_nacimiento,
        req.body.telefono.trim(),
        req.body.correo.trim().toLowerCase(),
        req.body.direccion.trim()
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Paciente registrado correctamente',
      data: resultado.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

// 2. Leer pacientes usando un filtro por apellido.
app.get('/api/pacientes', async (req, res, next) => {
  try {
    const apellido = req.query.apellido?.trim();

    if (!apellido) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro apellido es obligatorio'
      });
    }

    const resultado = await pool.query(
      `SELECT *
         FROM public.paciente
        WHERE apellido ILIKE $1
        ORDER BY id_paciente`,
      [`%${apellido}%`]
    );

    return res.status(200).json({
      success: true,
      message: 'Consulta realizada correctamente',
      total: resultado.rowCount,
      data: resultado.rows
    });
  } catch (error) {
    return next(error);
  }
});

// 3. Actualizar únicamente un paciente ficticio creado para la prueba.
app.patch('/api/pacientes/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID del paciente no es válido'
      });
    }

    const campos = Object.keys(req.body);
    const noPermitidos = campos.filter((campo) => !camposPaciente.includes(campo));

    if (campos.length === 0 || noPermitidos.length > 0) {
      return res.status(400).json({
        success: false,
        message: noPermitidos.length
          ? `Campos no permitidos: ${noPermitidos.join(', ')}`
          : 'Debes enviar al menos un campo para actualizar'
      });
    }

    if (req.body.correo !== undefined && !esCorreoDePrueba(req.body.correo)) {
      return res.status(400).json({
        success: false,
        message: 'El correo de prueba debe terminar en @example.test'
      });
    }

    const valores = campos.map((campo) =>
      typeof req.body[campo] === 'string' ? req.body[campo].trim() : req.body[campo]
    );
    const asignaciones = campos.map((campo, indice) => `${campo} = $${indice + 1}`);

    valores.push(Number(req.params.id), '%@example.test');

    const resultado = await pool.query(
      `UPDATE public.paciente
          SET ${asignaciones.join(', ')}
        WHERE id_paciente = $${valores.length - 1}
          AND correo ILIKE $${valores.length}
      RETURNING *`,
      valores
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paciente de prueba no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Paciente actualizado correctamente',
      data: resultado.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

// 4. Eliminar únicamente un paciente ficticio creado para la prueba.
app.delete('/api/pacientes/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'El ID del paciente no es válido'
      });
    }

    const resultado = await pool.query(
      `DELETE FROM public.paciente
        WHERE id_paciente = $1
          AND correo ILIKE $2
      RETURNING id_paciente`,
      [Number(req.params.id), '%@example.test']
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paciente de prueba no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Paciente eliminado correctamente'
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError) {
    return res.status(400).json({
      success: false,
      message: 'El cuerpo contiene JSON inválido'
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'El correo ya está registrado'
    });
  }

  if (error.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'No se puede eliminar porque existen registros relacionados'
    });
  }

  console.error('Error de base de datos:', error.code || 'desconocido');
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

async function iniciarServidor() {
  await pool.query('SELECT 1');
  app.listen(PORT, HOST, () => {
    console.log(`API CLAUDENT disponible en http://${HOST}:${PORT}`);
  });
}

iniciarServidor().catch((error) => {
  console.error('No fue posible conectar con PostgreSQL:', error.code || 'revisa el archivo .env');
  process.exit(1);
});
