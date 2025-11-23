# MiTurno – Sistema de reservas para negocios de servicios

## Descripción

MiTurno es una aplicación web que permite a negocios de servicios (peluquerías, barberías, salones de belleza, etc.) gestionar de forma centralizada sus citas, servicios, empleados y clientes.  
El sistema ofrece una vista pública para que los clientes reserven en línea y un panel administrativo para que el negocio controle su agenda, realice cancelaciones, gestione horarios y envíe notificaciones automáticas por correo electrónico.

---

## Arquitectura general

La aplicación está construida como una SPA (Single Page Application) sobre **Next.js** usando el **App Router**, lo que permite combinar páginas de cliente y de servidor, además de exponer rutas API dentro del mismo proyecto.  
El frontend (interfaz de usuario) se implementa con **React** y **Tailwind CSS**, mientras que el backend ligero se resuelve con las API Routes de Next.js y **Supabase** como BaaS (Base de datos Postgres, autenticación y storage).   

---

## Stack tecnológico

### Framework y lenguaje

- **Next.js (App Router)**  
  - Ruteo de páginas públicas y privadas.  
  - Renderizado híbrido (SSR/CSR) y API Routes para lógica de negocio básica.  

- **React**  
  - Componentes funcionales para la UI.  
  - Hooks como `useState` y `useEffect` para manejar estado y efectos (carga de datos, cambios en la interfaz).

- **TypeScript**  
  - Tipado estático para el modelo de datos de Supabase (`database.ts`) y el resto del código.  
  - Reduce errores de tiempo de ejecución y mejora el autocompletado en el IDE.

### Estilos y UI

- **Tailwind CSS**  
  - Estilos utilitarios para construir una interfaz moderna y responsiva.  
  - Permite prototipar rápido sin mantener grandes hojas de estilo personalizadas.

- **Componentes UI (Card, Button, Input, etc.)**  
  - Componentes reutilizables para formularios, tarjetas de cita, listados y paneles administrativos.

### Backend as a Service

- **Supabase (Postgres + Auth + Storage)**  
  - Base de datos relacional con tablas principales: `negocios`, `servicios`, `usuarios`, `clientes`, `citas`, `horarios_empleados`.  
  - Autenticación y gestión de usuarios (roles `admin` y `empleado`) y relación con la tabla `usuarios`.  
  - Storage para posibles recursos como imágenes de servicios o fotos de empleados.  

- **Clientes Supabase**  
  - Cliente de navegador (`createBrowserClient`) para consultar y modificar datos desde componentes cliente.  
  - Cliente de servidor (`createServerClient`) para rutas API y componentes de servidor con manejo de cookies/sesión.

### Notificaciones por correo

- **EmailJS**  
  - Integración desde el frontend para enviar correos transaccionales usando plantillas.  
  - Plantillas específicas para:
    - Confirmación de cita (fecha, hora, servicio, empleado, datos del cliente).  
    - Cancelación de cita (informando que la cita ha sido anulada).

---

## Funcionalidades principales

- **Gestión de negocios**
  - Registro de datos básicos del negocio: nombre, logo, dirección, ciudad, teléfono, límites de reserva y buffer entre citas.

- **Gestión de servicios**
  - Creación y edición de servicios con nombre, descripción, precio, duración y estado (activo/inactivo).  
  - Asociación de servicios a un negocio específico.

- **Gestión de empleados**
  - Alta de empleados desde el panel admin, creando usuario en Supabase Auth y perfil en la tabla `usuarios`.  
  - Asignación de rol `empleado`, negocio al que pertenece, datos de contacto y foto de perfil.

- **Gestión de clientes**
  - Registro automático de clientes al momento de reservar (nombre completo, email, teléfono).  
  - Reutilización del cliente si ya existe en el mismo negocio (evita duplicados).

- **Horarios y disponibilidad**
  - Tabla `horarios_empleados` para definir horarios laborales por día de la semana y estado de descanso.  
  - Cálculo de horas disponibles considerando:
    - Horario del empleado.  
    - Duración del servicio.  
    - Citas ya confirmadas para evitar solapamientos.

- **Reservas para clientes (front público)**
  - Flujo guiado en pasos: seleccionar servicio → seleccionar empleado → elegir fecha → elegir hora → llenar datos personales.  
  - Validaciones de campos obligatorios y feedback visual (cargando, errores, confirmación).  
  - Creación de la cita en la tabla `citas` con estado `confirmada`.

- **Panel de administración de citas**
  - Listado de todas las citas del negocio agrupadas por fecha.  
  - Filtros por estado (`todas`, `confirmada`, `cancelada`).  
  - Acciones:
    - Cancelar cita (cambia el estado a `cancelada` y dispara correo al cliente).  
    - Eliminar cita (borra definitivamente el registro).  
    - Crear cita de prueba mediante endpoint específico.

- **Notificaciones por correo**
  - **Confirmación de cita:** se envía automáticamente al crear una reserva, incluyendo servicio, empleado, fecha y hora.  
  - **Cancelación de cita:** se envía cuando el administrador cambia el estado de una cita a `cancelada` desde el panel.

- **Seguridad y autenticación**
  - Acceso al panel `/admin` restringido a usuarios con rol `admin`.  
  - Separación entre flujo público de reservas (sin login) y flujo administrativo (requiere autenticación).

---

## Flujo del administrador

1. **Registro / acceso del administrador**
   - El administrador accede a la aplicación y se autentica mediante Supabase Auth.  
   - Una vez autenticado y con rol `admin`, obtiene acceso al panel `/admin`.

2. **Configuración inicial del negocio**
   - Registra/edita los datos del negocio: nombre, dirección, ciudad, teléfono, logo, parámetros de reserva (días máximos, buffers).  

3. **Creación y gestión de servicios**
   - Desde la sección de servicios, crea nuevos servicios especificando nombre, descripción, duración y precio.  
   - Puede activar/desactivar servicios según la oferta actual del negocio.

4. **Registro de empleados**
   - Utiliza el formulario de creación de empleados para:
     - Crear el usuario en Supabase Auth (correo y contraseña).  
     - Registrar el perfil en la tabla `usuarios` con rol `empleado`, teléfono y foto opcional.  

5. **Configuración de horarios**
   - Define, para cada empleado, los horarios de trabajo por día en `horarios_empleados` (hora inicio, hora fin, días de descanso).  

6. **Gestión diaria de citas**
   - Visualiza todas las citas del negocio agrupadas por fecha.  
   - Filtra por estado (todas, confirmadas, canceladas).  
   - Puede:
     - **Cancelar** una cita (estado pasa a `cancelada` y se envía email de cancelación al cliente).  
     - **Eliminar** una cita si ya no debe figurar en el sistema.  
     - **Crear citas de prueba** para validar el flujo o hacer demostraciones.  

7. **Seguimiento y control**
   - Supervisa la ocupación de la agenda de empleados y la distribución de servicios.  
   - Ajusta servicios, empleados u horarios según la carga de trabajo y necesidades del negocio.

---

## Flujo del empleado

> Nota: el rol `empleado` se centra en prestar el servicio; en esta versión inicial, el acceso principal está pensado para que el administrador gestione las citas, pero el modelo de datos y la autenticación ya soportan un flujo específico de empleado.

1. **Acceso como empleado**
   - El empleado puede autenticarse con el usuario creado por el administrador (Supabase Auth).  
   - En versiones futuras, puede tener un panel reducido donde solo vea sus propias citas.

2. **Asignación de citas**
   - Las citas creadas por los clientes se asocian a un `empleado_id`.  
   - El empleado tiene visibilidad (directa o a través del admin) de su agenda diaria, con hora de inicio, fin y tipo de servicio.

3. **Ejecución del servicio**
   - El empleado atiende al cliente según la información de la cita (servicio, duración, notas del cliente si aplica).  

4. **Escalabilidad futura**
   - El modelo actual permite ampliar el rol de empleado para:
     - Ver/gestionar solo sus citas.  
     - Marcar estados adicionales (en progreso, finalizada).  
     - Registrar notas o resultados por cita.

---

## Flujo del cliente

A alto nivel, el flujo es:

1. El cliente accede a la página de reservas, selecciona servicio, empleado, fecha y hora, e ingresa sus datos de contacto.  
2. El frontend se comunica con Supabase para crear o reutilizar el registro del cliente y generar la cita en la tabla `citas`.  
3. Se dispara una notificación por correo (confirmación o cancelación) usando EmailJS y plantillas dinámicas.  
4. El administrador, desde el panel `/admin`, puede ver todas las citas del negocio, filtrarlas, cancelarlas o eliminarlas, así como crear citas de prueba y gestionar su agenda. 

