# Gestión de bases · ObradORR 2.1.0-RC7

## Acciones disponibles

### Usar base incluida en la aplicación
Sustituye la base activa por el catálogo incluido en el paquete.

### Crear base nueva limpia
Carga una plantilla ObradORR compatible sin elaboraciones ni ingredientes propios. Conserva estructura, unidades, alérgenos y tablas maestras necesarias.

### Restaurar SQLite sustituyendo
Carga una SQLite externa compatible y sustituye la base activa tras validación.

### Importar y combinar SQLite
Importa datos desde otra base compatible sin sobreescribir registros existentes.

### Validar base activa
Ejecuta comprobaciones básicas sobre la base actualmente cargada.

## Advertencia

Reset local del navegador no es lo mismo que crear una base nueva. El reset borra recuperación local IndexedDB/localStorage; la base nueva limpia sustituye la base activa por una plantilla válida.
