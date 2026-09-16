-- =====================================================
-- Esquema de Base de Datos PostgreSQL / PostgREST
-- Proyecto: CRM Zavala (Grupo Terrenos)
-- =====================================================

-- Eliminar tablas si existen (Limpieza)
DROP TABLE IF EXISTS "citas" CASCADE;
DROP TABLE IF EXISTS "proformas" CASCADE;
DROP TABLE IF EXISTS "reservas" CASCADE;
DROP TABLE IF EXISTS "ventas" CASCADE;
DROP TABLE IF EXISTS "objections" CASCADE;
DROP TABLE IF EXISTS "audit" CASCADE;
DROP TABLE IF EXISTS "usuarios" CASCADE;
DROP TABLE IF EXISTS "leads" CASCADE;
DROP TABLE IF EXISTS "agencias" CASCADE;
DROP TABLE IF EXISTS "urbanizaciones" CASCADE;
DROP TABLE IF EXISTS "settings" CASCADE;

-- 1. Tabla de Agencias
CREATE TABLE "agencias" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    manager VARCHAR(255) NOT NULL,
    advisors_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Activa',
    projects TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Usuarios / Asesores
CREATE TABLE "usuarios" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) DEFAULT 'Zavala2026*',
    phone VARCHAR(50) DEFAULT '+593 99 876 5432',
    cedula VARCHAR(20) DEFAULT '1720349811',
    bio TEXT DEFAULT 'Asesor comercial inmobiliario en Grupo Terrenos.',
    role VARCHAR(100) NOT NULL,
    agency_id INT REFERENCES "agencias"(id) ON DELETE SET NULL,
    supervisor VARCHAR(255) DEFAULT '—',
    status VARCHAR(50) DEFAULT 'Activo',
    last_access VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "password_reset_codes" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- 3. Tabla de Leads / Contactos
CREATE TABLE "leads" (
    id SERIAL PRIMARY KEY,
    first VARCHAR(255),
    last VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    email VARCHAR(255),
    source VARCHAR(100) DEFAULT 'WhatsApp',
    project VARCHAR(255),
    agency VARCHAR(255),
    advisor VARCHAR(255),
    status VARCHAR(100) DEFAULT 'Nuevo',
    temp VARCHAR(50) DEFAULT 'Tibio',
    next_follow VARCHAR(100),
    stage VARCHAR(100) DEFAULT 'lead',
    deal_value NUMERIC(12,2) DEFAULT 0,
    cedula VARCHAR(50),
    consent_accepted INT DEFAULT 0,
    consent_date VARCHAR(100),
    consent_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Citas
CREATE TABLE "citas" (
    id SERIAL PRIMARY KEY,
    lead_id INT REFERENCES "leads"(id) ON DELETE CASCADE,
    date VARCHAR(255) NOT NULL,
    type VARCHAR(100) DEFAULT 'Visita al terreno',
    location VARCHAR(255),
    status VARCHAR(100) DEFAULT 'Programada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Proformas
CREATE TABLE "proformas" (
    id SERIAL PRIMARY KEY,
    number VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    project VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    value NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(100) DEFAULT 'Enviada',
    date VARCHAR(100),
    advisor VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Reservas
CREATE TABLE "reservas" (
    id SERIAL PRIMARY KEY,
    client VARCHAR(255) NOT NULL,
    project VARCHAR(255) NOT NULL,
    block VARCHAR(100),
    lot VARCHAR(100),
    value NUMERIC(12,2) DEFAULT 0,
    date VARCHAR(100),
    status VARCHAR(100) DEFAULT 'Pendiente',
    advisor VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Ventas
CREATE TABLE "ventas" (
    id SERIAL PRIMARY KEY,
    client VARCHAR(255) NOT NULL,
    project VARCHAR(255) NOT NULL,
    lot VARCHAR(100),
    value NUMERIC(12,2) DEFAULT 0,
    down NUMERIC(12,2) DEFAULT 0,
    financing NUMERIC(12,2) DEFAULT 0,
    close_date VARCHAR(100),
    advisor VARCHAR(255),
    agency VARCHAR(255),
    status VARCHAR(100) DEFAULT 'Cerrada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Objeciones
CREATE TABLE "objections" (
    id SERIAL PRIMARY KEY,
    lead_id INT REFERENCES "leads"(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    date VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabla de Auditoría
CREATE TABLE "audit" (
    id SERIAL PRIMARY KEY,
    "user" VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    record VARCHAR(255),
    date VARCHAR(100),
    ip VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla de Configuración (Settings)
CREATE TABLE "settings" (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT
);

-- 11. Tabla de Urbanizaciones / Proyectos
CREATE TABLE "urbanizaciones" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    city VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Activo',
    available INT DEFAULT 0,
    ref_price NUMERIC(12,2) DEFAULT 0,
    description TEXT,
    categories TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Tabla de Notificaciones de WhatsApp
CREATE TABLE IF NOT EXISTS "whatsapp_notifications" (
    id VARCHAR(255) PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    lead_id INT,
    lead_name VARCHAR(255),
    advisor_name VARCHAR(255),
    advisor_phone VARCHAR(50),
    sender VARCHAR(50) DEFAULT 'cliente',
    text TEXT NOT NULL,
    time VARCHAR(100),
    timestamp BIGINT NOT NULL,
    read INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DATOS INICIALES (SEED DATA)
-- =====================================================

INSERT INTO "agencias" (name, city, manager, advisors_count, status, projects) VALUES
('Agencia Quito Norte', 'Quito', 'María José Salazar', 8, 'Activa', '["Vista del Valle", "Ciudad Verde Norte"]'),
('Agencia Guayaquil Centro', 'Guayaquil', 'Carlos Andrés Pinto', 11, 'Activa', '["Terrazas del Río", "Bosques de Samborondón"]'),
('Agencia Cuenca', 'Cuenca', 'Daniela Vera', 5, 'Activa', '["Vista del Valle"]'),
('Agencia Manta', 'Manta', 'Luis Fernando Ortiz', 3, 'Inactiva', '["Bosques de Samborondón"]');

INSERT INTO "usuarios" (name, email, phone, role, agency_id, supervisor, status, last_access) VALUES
('Gabriel Alejandro Ramos', 'gabriel.ramos@grupoterrenos.com', '+593 99 000 0001', 'CEO', 1, '—', 'Activo', 'Hoy, 08:30'),
('María José Salazar', 'maria.salazar@grupoterrenos.com', '+593 99 004 0005', 'Director Administrativo', 1, 'Gabriel Alejandro Ramos', 'Activo', 'Hoy, 09:12'),
('Carlos Andrés Pinto', 'carlos.pinto@grupoterrenos.com', '+593 96 543 0004', 'Supervisor Comercial', 2, 'María José Salazar', 'Activo', 'Hoy, 08:40'),
('Daniela Vera', 'daniela.vera@grupoterrenos.com', '+593 95 320 0003', 'Supervisor de Cobranzas', 3, 'María José Salazar', 'Activo', 'Hace 3 días'),
('Verónica Alarcón', 'veronica.alarcon@grupoterrenos.com', '+593 97 665 0006', 'Asesora de Cobranzas', 1, 'Daniela Vera', 'Activo', 'Hoy, 09:45'),
('Lorena Gabriela Aguirre', 'lorena.aguirre@grupoterrenos.com', '+593 93 111 0007', 'Administrativo', 1, 'María José Salazar', 'Activo', 'Ayer, 16:20'),
('Andrea Cedeño', 'andrea.cedeno@grupoterrenos.com', '+593 99 812 0001', 'Asesor Comercial', 1, 'Carlos Andrés Pinto', 'Activo', 'Ayer, 17:05'),
('Juan Pablo Merizalde', 'juan.merizalde@grupoterrenos.com', '+593 98 221 0002', 'Asesor Comercial', 2, 'Carlos Andrés Pinto', 'Activo', 'Hoy, 10:22'),
('Jorge Luis Cevallos', 'jorge.cevallos@grupoterrenos.com', '+593 98 774 0008', 'Chofer', 1, 'Lorena Gabriela Aguirre', 'Activo', 'Hoy, 07:50'),
('Luis Fernando Ortiz', 'luis.ortiz@grupoterrenos.com', '+593 99 999 0009', 'Asesor Comercial', 4, 'Carlos Andrés Pinto', 'Inactivo', 'Hace 2 semanas');

INSERT INTO "leads" (first, last, name, phone, email, source, project, agency, advisor, status, temp, next_follow, stage, deal_value) VALUES
('Fernanda', 'Rivas', 'Fernanda Rivas', '+593 99 812 3344', 'fernanda.rivas@example.com', 'WhatsApp', 'Vista del Valle', 'Agencia Quito Norte', 'Andrea Cedeño', 'Nuevo', 'Caliente', '08 Jul 2026', 'lead', 41000),
('Roberto', 'Chávez', 'Roberto Chávez', '+593 98 221 9087', 'roberto.chavez@example.com', 'Facebook', 'Terrazas del Río', 'Agencia Guayaquil Centro', 'Juan Pablo Merizalde', 'Contactado', 'Tibio', '09 Jul 2026', 'discover', 35800),
('Gabriela', 'Torres', 'Gabriela Torres', '+593 96 543 1122', 'gabriela.torres@example.com', 'Instagram', 'Ciudad Verde Norte', 'Agencia Quito Norte', 'Andrea Cedeño', 'Cita agendada', 'Caliente', '10 Jul 2026', 'present', 39600),
('Diego', 'Salinas', 'Diego Salinas', '+593 95 320 7788', 'diego.salinas@example.com', 'Referido', 'Vista del Valle', 'Agencia Cuenca', 'Daniela Vera', 'Proforma', 'Caliente', '11 Jul 2026', 'proforma', 52500),
('Paola', 'Andrade', 'Paola Andrade', '+593 99 004 5566', 'paola.andrade@example.com', 'TikTok', 'Bosques de Samborondón', 'Agencia Guayaquil Centro', 'Juan Pablo Merizalde', 'Reservado', 'Tibio', '14 Jul 2026', 'reserve', 44800),
('Kevin', 'Mora', 'Kevin Mora', '+593 93 111 2233', 'kevin.mora@example.com', 'Llamada', 'Terrazas del Río', 'Agencia Guayaquil Centro', 'Juan Pablo Merizalde', 'Vendido', 'Frío', '—', 'close', 39200),
('Silvana', 'Peña', 'Silvana Peña', '+593 98 774 4321', 'silvana.pena@example.com', 'Formulario web', 'Vista del Valle', 'Agencia Quito Norte', 'Andrea Cedeño', 'Nuevo', 'Frío', '08 Jul 2026', 'lead', 33000),
('Andrés', 'Zambrano', 'Andrés Zambrano', '+593 97 665 3210', 'andres.zambrano@example.com', 'WhatsApp', 'Ciudad Verde Norte', 'Agencia Cuenca', 'Daniela Vera', 'Reintentar', 'Tibio', '12 Jul 2026', 'retry', 29500);

INSERT INTO "citas" (lead_id, date, type, location, status) VALUES
(3, '10 Jul 2026, 11:00', 'Visita al terreno', 'Vista del Valle, Mz 2', 'Programada');

INSERT INTO "proformas" (number, client_name, project, category, value, status, date, advisor, details) VALUES
('PF-2026-0341', 'Diego Salinas', 'Vista del Valle', 'Categoría A', 52500, 'Enviada', '05 Jul 2026', 'Daniela Vera', '{"area": 250, "costoM2": 210, "discount": 0, "down": 5000, "rate": 8, "term": 12}'),
('PF-2026-0338', 'Paola Andrade', 'Bosques de Samborondón', 'Categoría B', 44800, 'Aceptada', '02 Jul 2026', 'Juan Pablo Merizalde', '{"area": 220, "costoM2": 210, "discount": 3, "down": 4480, "rate": 8, "term": 36}'),
('PF-2026-0330', 'Kevin Mora', 'Terrazas del Río', 'Categoría C', 39200, 'Vencida', '20 Jun 2026', 'Juan Pablo Merizalde', '{"area": 200, "costoM2": 196, "discount": 0, "down": 7840, "rate": 8, "term": 72}');

INSERT INTO "reservas" (client, project, block, lot, value, date, status, advisor) VALUES
('Paola Andrade', 'Bosques de Samborondón', 'M-4', 'Lote 12', 2500, '03 Jul 2026', 'Confirmada', 'Juan Pablo Merizalde'),
('Diego Salinas', 'Vista del Valle', 'M-2', 'Lote 07', 3000, '06 Jul 2026', 'Pendiente', 'Daniela Vera');

INSERT INTO "ventas" (client, project, lot, value, down, financing, close_date, advisor, agency, status) VALUES
('Kevin Mora', 'Terrazas del Río', 'Lote 21', 39200, 7840, 31360, '25 Jun 2026', 'Juan Pablo Merizalde', 'Agencia Guayaquil Centro', 'Cerrada');

INSERT INTO "objections" (lead_id, text, date) VALUES
(8, 'Precio demasiado alto para su presupuesto actual', '02 Jul 2026'),
(7, 'Prefiere una ubicación más cercana a la autopista', '29 Jun 2026');

INSERT INTO "audit" ("user", action, module, record, date, ip) VALUES
('María José Salazar', 'Editó', 'Agencias', 'Agencia Quito Norte', '08 Jul 2026 09:14', '190.11.23.4'),
('Juan Pablo Merizalde', 'Creó', 'Reservas', 'Reserva #R-0089', '07 Jul 2026 16:02', '190.11.55.6'),
('Andrea Cedeño', 'Aplicó descuento', 'Cotizador', 'Proforma PF-2026-0341', '05 Jul 2026 11:47', '190.11.23.9');

INSERT INTO "settings" (key, value) VALUES
('whatsapp_webhook_url', ''),
('default_interest_rate', '8%'),
('minimum_down_payment', '15%'),
('maximum_term_years', '10'),
('consent_text', 'Autorizo el tratamiento de mis datos personales conforme a la Ley Orgánica de Protección de Datos Personales, con fines de gestión comercial, contacto y elaboración de proformas.');

-- --------------------------------------------------------
-- TABLAS NORMALIZADAS DE PROYECTOS, CATEGORIAS Y PLANES
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS proyectos (
  id_proyecto SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  city VARCHAR(255) DEFAULT 'Santo Domingo',
  status VARCHAR(50) DEFAULT 'Activo',
  available INT DEFAULT 30,
  ref_price NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS planes_financiamiento (
  id SERIAL PRIMARY KEY,
  id_proyecto INT REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
  id_categoria INT REFERENCES categorias(id_categoria) ON DELETE CASCADE,
  costo_m2 NUMERIC(12,2) NOT NULL DEFAULT 0,
  anios_plazo NUMERIC(6,2) DEFAULT 0,
  meses_plazo INT DEFAULT 0,
  entrada_minima NUMERIC(12,2) DEFAULT 0,
  es_contado BOOLEAN DEFAULT FALSE,
  plazo_entrada VARCHAR(100) DEFAULT 'CONTADO',
  area_minima NUMERIC(12,2) DEFAULT 0,
  valor_contado NUMERIC(12,2) DEFAULT 0,
  saldo NUMERIC(12,2) DEFAULT 0,
  tasa_financiamiento NUMERIC(6,2) DEFAULT 8.00,
  cuota NUMERIC(12,2) DEFAULT 0,
  valor_final NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 2. INSERCIÓN DE TODOS LOS PROYECTOS
-- --------------------------------------------------------
INSERT INTO proyectos (id_proyecto, nombre, code, city, status, available, ref_price, description) VALUES
(1, 'DIVINA MISERICORDIA I', 'DM-01', 'Santo Domingo', 'Activo', 35, 110.50, 'Proyecto urbanístico DIVINA MISERICORDIA I con financiamiento directo.'),
(2, 'DIVINA MISERICORDIA 2', 'DM-02', 'Santo Domingo', 'Activo', 40, 146.67, 'Proyecto urbanístico DIVINA MISERICORDIA 2 con financiamiento directo.'),
(3, 'DIVINA MISERICORDIA 3 (ANTES OLEODUCTO)', 'DM-03A', 'Santo Domingo', 'Activo', 45, 201.67, 'Proyecto urbanístico DIVINA MISERICORDIA 3 (ANTES OLEODUCTO) con financiamiento directo.'),
(4, 'DIVINA MISERICORDIA 3 (DESPUES OLEODUCTO)', 'DM-03B', 'Santo Domingo', 'Activo', 42, 131.67, 'Proyecto urbanístico DIVINA MISERICORDIA 3 (DESPUES OLEODUCTO) con financiamiento directo.'),
(5, 'CAVANIS', 'CVN-05', 'Santo Domingo', 'Activo', 38, 205.00, 'Proyecto urbanístico CAVANIS con financiamiento directo.'),
(6, 'SAN RAFAEL', 'SRF-06', 'Santo Domingo', 'Activo', 30, 104.00, 'Proyecto urbanístico SAN RAFAEL con financiamiento directo.'),
(7, 'DORADO ILZ', 'DRD-07', 'Santo Domingo', 'Activo', 25, 200.00, 'Proyecto urbanístico DORADO ILZ con financiamiento directo.'),
(8, 'VENECIA LY', 'VNC-08', 'Santo Domingo', 'Activo', 50, 15.00, 'Proyecto urbanístico VENECIA LY con financiamiento directo.'),
(9, 'VENECIA II', 'VNC-09', 'Santo Domingo', 'Activo', 48, 22.00, 'Proyecto urbanístico VENECIA II con financiamiento directo.'),
(10, 'MONACO', 'MNC-10', 'Santo Domingo', 'Activo', 55, 156.40, 'Proyecto urbanístico MONACO con financiamiento directo.'),
(11, 'SAN JOSE Y GUADALUPE', 'SJG-11', 'Santo Domingo', 'Activo', 32, 155.00, 'Proyecto urbanístico SAN JOSE Y GUADALUPE con financiamiento directo.'),
(12, 'GUADALUPE II', 'GDP-12', 'Santo Domingo', 'Activo', 36, 111.00, 'Proyecto urbanístico GUADALUPE II con financiamiento directo.'),
(13, 'SAN JUAN', 'SJN-13', 'Santo Domingo', 'Activo', 28, 140.00, 'Proyecto urbanístico SAN JUAN con financiamiento directo.'),
(14, 'SAN PABLO II', 'SPB-14', 'Santo Domingo', 'Activo', 20, 135.00, 'Proyecto urbanístico SAN PABLO II con financiamiento directo.'),
(15, 'SAN MARCOS', 'SMC-15', 'Santo Domingo', 'Activo', 22, 130.00, 'Proyecto urbanístico SAN MARCOS con financiamiento directo.'),
(16, 'ESTADOS UNIDOS', 'EUN-16', 'Santo Domingo', 'Activo', 40, 40.00, 'Proyecto urbanístico ESTADOS UNIDOS con financiamiento directo.'),
(17, 'SANTA MARIA', 'STM-17', 'Santo Domingo', 'Activo', 34, 150.00, 'Proyecto urbanístico SANTA MARIA con financiamiento directo.'),
(18, 'STA MONICA', 'STC-18', 'Santo Domingo', 'Activo', 29, 103.00, 'Proyecto urbanístico STA MONICA con financiamiento directo.'),
(19, 'GUADALUPE', 'GDP-19', 'Santo Domingo', 'Activo', 35, 110.00, 'Proyecto urbanístico GUADALUPE con financiamiento directo.'),
(20, 'PRAGA', 'PRG-20', 'Santo Domingo', 'Activo', 30, 133.33, 'Proyecto urbanístico PRAGA con financiamiento directo.'),
(21, 'PLAZA SCH', 'PLS-21', 'Santo Domingo', 'Activo', 26, 152.50, 'Proyecto urbanístico PLAZA SCH con financiamiento directo.'),
(22, 'LISBOA', 'LSB-22', 'Santo Domingo', 'Activo', 31, 133.33, 'Proyecto urbanístico LISBOA con financiamiento directo.'),
(23, 'QUINTAS SAN JOSE', 'QSJ-23', 'Santo Domingo', 'Activo', 60, 25.00, 'Proyecto urbanístico QUINTAS SAN JOSE con macro-lotes campestres.'),
(24, 'SAN FRANCISCO POR COLORES', 'SFC-24', 'Santo Domingo', 'Activo', 70, 43.57, 'Proyecto urbanístico SAN FRANCISCO POR COLORES con financiamiento directo.'),
(25, 'SAN MARTIN', 'SMT-25', 'Santo Domingo', 'Activo', 33, 152.50, 'Proyecto urbanístico SAN MARTIN con financiamiento directo.'),
(26, 'EL CORTIJO', 'CRT-26', 'Santo Domingo', 'Activo', 45, 34.00, 'Proyecto urbanístico EL CORTIJO con financiamiento directo.'),
(27, 'ORQUIDEAS', 'ORQ-27', 'Santo Domingo', 'Activo', 28, 115.00, 'Proyecto urbanístico ORQUIDEAS con financiamiento directo.'),
(28, 'DORADO-REITZ', 'DRZ-28', 'Santo Domingo', 'Activo', 24, 169.00, 'Proyecto urbanístico DORADO-REITZ con financiamiento directo.'),
(29, 'VIENA', 'VNA-29', 'Santo Domingo', 'Activo', 36, 142.50, 'Proyecto urbanístico VIENA con financiamiento directo.'),
(30, 'BUDAPEST', 'BDP-30', 'Santo Domingo', 'Activo', 36, 142.50, 'Proyecto urbanístico BUDAPEST con financiamiento directo.'),
(31, 'DORADO III VIA QUITO', 'DRQ-31', 'Santo Domingo', 'Activo', 40, 216.00, 'Proyecto urbanístico DORADO III VIA QUITO con financiamiento directo.');

-- --------------------------------------------------------
-- 3. INSERCIÓN DE TODAS LAS CATEGORÍAS (Normalizadas)
-- --------------------------------------------------------
INSERT INTO categorias (id_categoria, nombre) VALUES
(1, 'COMERCIAL'),
(2, 'RESIDENCIAL'),
(3, 'PREMIUM'),
(4, 'SECUNDARIO'),
(5, 'PRINCIPAL'),
(6, 'COMERCIAL 2'),
(7, 'RESIDENCIAL 1'),
(8, 'RESIDENCIAL 2'),
(9, 'COMERCIAL O PREMIUM'),
(10, 'PRINCIPAL Y SECUNDARIO'),
(11, 'PRINCIPAL Y ESQUINERO'),
(12, 'COMERCIAL Y ESQUINERO'),
(13, 'FRENTE AL RIO'),
(14, 'RESERVADO'),
(15, 'INTERMEDIO'),
(16, 'ASFALTO'),
(17, 'DORADO 1-P1'),
(18, 'DORADO 2-P1'),
(19, 'PLATEADO-P2'),
(20, 'ROSADO P6'),
(21, 'VERDE-P3'),
(22, 'TURQUESA-P4'),
(23, 'AMARILLO P-5'),
(24, 'PRINCIPAL Y ESQ. SIN HIPOTECA'),
(25, 'RESIDENCIALES SIN HIPOTECA'),
(26, 'PRINCIPAL Y ESQ. CON HIPOTECA'),
(27, 'RESIDENCIALES CON HIPOTECA');

-- --------------------------------------------------------
-- 4. INSERCIÓN DE TODOS LOS PLANES DE FINANCIAMIENTO
-- --------------------------------------------------------
INSERT INTO planes_financiamiento 
(id_proyecto, id_categoria, costo_m2, anios_plazo, meses_plazo, entrada_minima, es_contado, plazo_entrada, area_minima, valor_contado, saldo, tasa_financiamiento, cuota, valor_final) 
VALUES
-- DIVINA MISERICORDIA I
(1, 1, 113.00, 1, 120, 0.00, TRUE, 'CONTADO', 180, 20340.00, 20340.00, 8.00, 0.00, 20340.00),
(1, 2, 108.00, 1, 12, 0.00, TRUE, 'CONTADO', 180, 19440.00, 19440.00, 8.00, 0.00, 19440.00),

-- DIVINA MISERICORDIA 2
(2, 3, 160.00, 3, 36, 5000.00, FALSE, '3 MESES', 200, 32000.00, 27000.00, 8.00, 847.00, 38000.00),
(2, 1, 150.00, 3, 36, 3000.00, FALSE, '2 MESES', 200, 30000.00, 27000.00, 8.00, 847.00, 30720.00),
(2, 4, 130.00, 3, 36, 1000.00, FALSE, '2 MESES', 200, 26000.00, 25000.00, 8.00, 784.00, 28720.00),

-- DIVINA MISERICORDIA 3 (ANTES OLEODUCTO)
(3, 3, 320.00, 1, 12, 25000.00, FALSE, '6 MESES', 200, 64000.00, 39000.00, 8.00, 3393.00, 65716.00),
(3, 1, 160.00, 1, 12, 5000.00, FALSE, '2 MESES', 200, 32000.00, 27000.00, 8.00, 2349.00, 33188.00),
(3, 5, 125.00, 1, 12, 5000.00, FALSE, '2 MESES', 200, 25000.00, 20000.00, 8.00, 1740.00, 25880.00),

-- DIVINA MISERICORDIA 3 (DESPUES OLEODUCTO)
(4, 6, 160.00, 5, 60, 5000.00, FALSE, '2 MESES', 200, 32000.00, 27000.00, 8.00, 548.00, 37880.00),
(4, 5, 125.00, 5, 60, 5000.00, FALSE, '2 MESES', 200, 25000.00, 20000.00, 8.00, 406.00, 29360.00),
(4, 7, 110.00, 5, 60, 3000.00, FALSE, '2 MESES', 200, 22000.00, 19000.00, 8.00, 386.00, 26160.00),

-- CAVANIS
(5, 3, 320.00, 1, 12, 20000.00, FALSE, '4 MESES', 300, 96000.00, 76000.00, 8.00, 6612.00, 122000.00),
(5, 1, 175.00, 1, 12, 5000.00, FALSE, '3 MESES', 120, 21000.00, 16000.00, 8.00, 1392.00, 26720.00),
(5, 5, 170.00, 1, 12, 5000.00, FALSE, '3 MESES', 120, 20400.00, 15400.00, 8.00, 1340.00, 25760.00),
(5, 2, 155.00, 1, 12, 4000.00, FALSE, '2 MESES', 120, 18600.00, 14600.00, 8.00, 1271.00, 23560.00),

-- SAN RAFAEL
(6, 5, 108.00, 1, 12, 5000.00, FALSE, '3 MESES', 200, 21600.00, 16600.00, 8.00, 1445.00, 22340.00),
(6, 2, 100.00, 1, 12, 3000.00, FALSE, '3 MESES', 200, 20000.00, 17000.00, 8.00, 1479.00, 20748.00),

-- DORADO ILZ
(7, 1, 200.00, 1, 12, 5000.00, FALSE, '2 PAGOS', 150, 30000.00, 25000.00, 8.00, 2175.00, 31100.00),

-- VENECIA LY
(8, 3, 17.00, 5, 60, 6000.00, FALSE, '6 MESES', 1500, 25500.00, 19500.00, 8.00, 396.00, 29760.00),
(8, 1, 15.00, 5, 60, 3000.00, FALSE, '5 MESES', 1500, 22500.00, 19500.00, 8.00, 396.00, 26760.00),
(8, 2, 13.00, 5, 60, 3000.00, FALSE, '5 MESES', 1500, 19500.00, 16500.00, 8.00, 335.00, 23100.00),

-- VENECIA II
(9, 3, 26.00, 5, 60, 10000.00, FALSE, '4 MESES', 1500, 39000.00, 29000.00, 8.00, 589.00, 45340.00),
(9, 1, 18.00, 5, 60, 6000.00, FALSE, '4 MESES', 1500, 27000.00, 21000.00, 8.00, 426.00, 31560.00),

-- MONACO
(10, 3, 320.00, 2, 24, 30000.00, FALSE, '6 MESES', 200, 64000.00, 34000.00, 8.00, 1538.00, 73680.00),
(10, 1, 137.00, 2, 24, 3000.00, FALSE, '2 MESES', 120, 16440.00, 13440.00, 8.00, 608.00, 21360.00),
(10, 5, 117.00, 2, 24, 3000.00, FALSE, '3 MESES', 120, 14040.00, 11040.00, 8.00, 500.00, 17880.00),
(10, 7, 108.00, 2, 24, 2500.00, FALSE, '2 MESES', 120, 12960.00, 10460.00, 8.00, 474.00, 16420.00),
(10, 8, 100.00, 2, 24, 2000.00, FALSE, '2 MESES', 120, 12000.00, 10000.00, 8.00, 453.00, 15800.00),

-- SAN JOSE Y GUADALUPE
(11, 9, 200.00, 1, 12, 5000.00, FALSE, '3 MESES', 200, 40000.00, 35000.00, 8.00, 3045.00, 41540.00),
(11, 10, 110.00, 1, 12, 3000.00, FALSE, '2 MESES', 200, 22000.00, 19000.00, 8.00, 1653.00, 22836.00),

-- GUADALUPE II
(12, 1, 113.00, 3, 36, 2500.00, FALSE, '3 MESES', 200, 22600.00, 20100.00, 8.00, 630.00, 25180.00),
(12, 7, 112.00, 3, 36, 2000.00, FALSE, '2 MESES', 200, 22400.00, 20400.00, 8.00, 640.00, 25040.00),
(12, 8, 108.00, 3, 36, 1000.00, FALSE, '2 MESES', 120, 12960.00, 11960.00, 8.00, 375.00, 14500.00),

-- SAN JUAN
(13, 3, 200.00, 3, 36, 5000.00, FALSE, '3 MESES', 200, 40000.00, 35000.00, 8.00, 1097.00, 44492.00),
(13, 1, 112.00, 3, 36, 2000.00, FALSE, '3 MESES', 120, 13440.00, 11440.00, 8.00, 359.00, 14924.00),
(13, 2, 108.00, 3, 36, 1000.00, FALSE, '2 MESES', 120, 12960.00, 11960.00, 8.00, 375.00, 14500.00),

-- SAN PABLO II
(14, 11, 135.00, 1, 12, 3000.00, FALSE, '3 MESES', 120, 16200.00, 13200.00, 8.00, 1149.00, 16788.00),

-- SAN MARCOS
(15, 5, 130.00, 1, 12, 5000.00, FALSE, '3 MESES', 200, 26000.00, 21000.00, 8.00, 1827.00, 26924.00),

-- ESTADOS UNIDOS
(16, 5, 40.00, 5, 60, 10000.00, FALSE, '3 MESES', 1000, 40000.00, 30000.00, 8.00, 609.00, 46540.00),

-- SANTA MARIA
(17, 1, 150.00, 1, 12, 5000.00, FALSE, '3 MESES', 200, 30000.00, 25000.00, 8.00, 2175.00, 31100.00),

-- STA MONICA
(18, 5, 108.00, 5, 60, 3000.00, FALSE, '3 MESES', 144, 15552.00, 12552.00, 8.00, 255.00, 18300.00),
(18, 2, 98.00, 5, 60, 1000.00, FALSE, '2 MESES', 136, 13328.00, 12328.00, 8.00, 250.00, 16000.00),

-- GUADALUPE
(19, 12, 113.00, 3, 36, 3000.00, FALSE, '2 MESES', 200, 22600.00, 19600.00, 8.00, 615.00, 25140.00),
(19, 5, 109.00, 3, 36, 2000.00, FALSE, '2 MESES', 200, 21800.00, 19800.00, 8.00, 621.00, 24356.00),
(19, 2, 108.00, 3, 36, 1000.00, FALSE, '2 MESES', 120, 12960.00, 11960.00, 8.00, 375.00, 14500.00),

-- PRAGA
(20, 1, 160.00, 3, 36, 10000.00, FALSE, '1 MES', 180, 28800.00, 18800.00, 8.00, 590.00, 31240.00),
(20, 11, 125.00, 3, 36, 5000.00, FALSE, '1 MES', 180, 22500.00, 17500.00, 8.00, 549.00, 24764.00),
(20, 2, 115.00, 3, 36, 3000.00, FALSE, '1 MES', 160, 18400.00, 15400.00, 8.00, 483.00, 20388.00),

-- PLAZA SCH
(21, 5, 180.00, 1, 12, 5000.00, FALSE, '3 MESES', 200, 36000.00, 31000.00, 8.00, 2697.00, 37364.00),
(21, 2, 160.00, 1, 12, 3000.00, FALSE, '3 MESES', 200, 32000.00, 29000.00, 8.00, 2523.00, 33276.00),
(21, 5, 140.00, 1, 12, 4000.00, FALSE, '3 MESES', 160, 22400.00, 18400.00, 8.00, 1601.00, 23212.00),
(21, 2, 130.00, 1, 12, 2000.00, FALSE, '2 MESES', 120, 15600.00, 13600.00, 8.00, 1184.00, 16208.00),

-- LISBOA
(22, 1, 160.00, 3, 36, 10000.00, FALSE, '1 MES', 200, 32000.00, 22000.00, 8.00, 690.00, 34840.00),
(22, 11, 125.00, 3, 36, 5000.00, FALSE, '1 MES', 160, 20000.00, 15000.00, 8.00, 471.00, 21956.00),
(22, 2, 115.00, 3, 36, 3000.00, FALSE, '1 MES', 160, 16800.00, 13800.00, 8.00, 433.00, 18588.00),

-- QUINTAS SAN JOSE
(23, 3, 40.00, 0, 0, 0.00, TRUE, '0 MESES', 1740, 69600.00, 69600.00, 0.00, 0.00, 69600.00),
(23, 13, 30.00, 8, 96, 3000.00, FALSE, '2 MESES', 1501.73, 45051.90, 42051.90, 8.00, 595.00, 60120.00),
(23, 14, 20.00, 8, 96, 5000.00, FALSE, '3 MESES', 1500, 30000.00, 25000.00, 8.00, 354.00, 38984.00),
(23, 11, 20.00, 8, 96, 2000.00, FALSE, '3 MESES', 1500, 30000.00, 28000.00, 8.00, 396.00, 40016.00),
(23, 2, 15.00, 8, 96, 1500.00, FALSE, '2 MESES', 1500, 22500.00, 21000.00, 8.00, 297.00, 30012.00),

-- SAN FRANCISCO POR COLORES
(24, 17, 55.00, 5, 60, 25000.00, FALSE, '2 PAGOS', 1000, 55000.00, 30000.00, 8.00, 609.00, 61540.00),
(24, 18, 55.00, 5, 60, 10000.00, FALSE, '2 PAGOS', 1000, 55000.00, 45000.00, 8.00, 913.00, 64780.00),
(24, 19, 45.00, 5, 60, 5000.00, FALSE, '1 PAGO', 1000, 45000.00, 40000.00, 8.00, 812.00, 53720.00),
(24, 20, 45.00, 5, 84, 3000.00, FALSE, '1 PAGO', 600, 27000.00, 24000.00, 8.00, 375.00, 34500.00),
(24, 21, 40.00, 5, 60, 3000.00, FALSE, '1 PAGO', 1000, 40000.00, 37000.00, 8.00, 751.00, 48060.00),
(24, 22, 35.00, 5, 60, 3000.00, FALSE, '1 PAGO', 1000, 35000.00, 32000.00, 8.00, 649.00, 41940.00),
(24, 23, 30.00, 5, 60, 3000.00, FALSE, '1 PAGO', 1000, 30000.00, 27000.00, 8.00, 548.00, 35880.00),

-- SAN MARTIN
(25, 12, 160.00, 3, 36, 5000.00, FALSE, '1 PAGO', 185, 29600.00, 24600.00, 8.00, 771.00, 32756.00),
(25, 2, 145.00, 3, 36, 5000.00, FALSE, '1 PAGO', 155, 22475.00, 17475.00, 8.00, 548.00, 24728.00),

-- EL CORTIJO
(26, 16, 50.00, 5, 60, 20000.00, FALSE, '3 PAGOS', 1500, 75000.00, 55000.00, 8.00, 1116.00, 86960.00),
(26, 11, 27.00, 5, 60, 10000.00, FALSE, '3 PAGOS', 1500, 40500.00, 30500.00, 8.00, 619.00, 47140.00),
(26, 15, 25.00, 5, 60, 10000.00, FALSE, '3 PAGOS', 1500, 37500.00, 27500.00, 8.00, 558.00, 43480.00),

-- ORQUIDEAS
(27, 11, 130.00, 2, 24, 5000.00, FALSE, '2 PAGOS', 180, 23400.00, 18400.00, 8.00, 833.00, 24992.00),
(27, 15, 100.00, 2, 24, 2500.00, FALSE, '2 PAGOS', 180, 18000.00, 15500.00, 8.00, 702.00, 19348.00),

-- DORADO-REITZ
(28, 11, 170.00, 1, 12, 5000.00, FALSE, '2 PAGOS', 150, 25500.00, 20500.00, 8.00, 1784.00, 26408.00),
(28, 15, 168.00, 1, 12, 2500.00, FALSE, '2 PAGOS', 150, 25200.00, 22700.00, 8.00, 1975.00, 26200.00),

-- VIENA
(29, 24, 150.00, 1, 12, 5000.00, FALSE, '1 PAGO', 185, 27750.00, 22750.00, 8.00, 1979.00, 28748.00),
(29, 25, 135.00, 1, 12, 5000.00, FALSE, '1 PAGO', 185, 24975.00, 19975.00, 8.00, 1738.00, 25856.00),
(29, 26, 150.00, 2, 24, 5000.00, FALSE, '1 PAGO', 155, 23250.00, 18250.00, 8.00, 826.00, 24824.00),
(29, 27, 135.00, 2, 24, 5000.00, FALSE, '1 PAGO', 155, 20925.00, 15925.00, 8.00, 721.00, 22304.00),

-- BUDAPEST
(30, 24, 150.00, 1, 12, 5000.00, FALSE, '1 PAGO', 185, 27750.00, 22750.00, 8.00, 1979.00, 28748.00),
(30, 25, 135.00, 1, 12, 5000.00, FALSE, '1 PAGO', 185, 24975.00, 19975.00, 8.00, 1738.00, 25856.00),
(30, 26, 150.00, 2, 24, 5000.00, FALSE, '1 PAGO', 155, 23250.00, 18250.00, 8.00, 826.00, 24824.00),
(30, 27, 135.00, 2, 24, 5000.00, FALSE, '1 PAGO', 155, 20925.00, 15925.00, 8.00, 721.00, 22304.00),

-- DORADO III VIA QUITO
(31, 3, 300.00, 1.5, 18, 5000.00, FALSE, '1 PAGO', 150, 45000.00, 40000.00, 0.00, 2223.00, 45014.00),
(31, 24, 200.00, 1.5, 18, 10000.00, FALSE, '1 PAGO', 150, 30000.00, 20000.00, 0.00, 1112.00, 30016.00),
(31, 25, 190.00, 1.5, 18, 10000.00, FALSE, '1 PAGO', 150, 28500.00, 18500.00, 0.00, 1028.00, 28504.00),
(31, 26, 200.00, 2, 24, 10000.00, FALSE, '1 PAGO', 150, 30000.00, 20000.00, 8.00, 0.00, 0.00),
(31, 27, 190.00, 2, 24, 10000.00, FALSE, '1 PAGO', 150, 28500.00, 18500.00, 8.00, 0.00, 0.00);

SELECT setval('proyectos_id_proyecto_seq', (SELECT MAX(id_proyecto) FROM proyectos));
SELECT setval('categorias_id_categoria_seq', (SELECT MAX(id_categoria) FROM categorias));
SELECT setval('planes_financiamiento_id_seq', (SELECT MAX(id) FROM planes_financiamiento));

