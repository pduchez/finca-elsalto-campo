-- Admin: listar usuarios (SIN hashes) y resetear Director1 a "password".
-- El hash es scrypt de la palabra "password" (mismo que usa el login).
\echo '===== USUARIOS EN EL SISTEMA (sin contraseñas) ====='
select username, nombre, rol, debe_cambiar_password, activo
from usuarios
order by rol, username;

update usuarios
set password_hash = 'scrypt:0df23e0c8bd8b21de15787c9901837f2:6eeacc8bcf44201140d8caf2b148a371eecdf5c0bef4e087971f9172a17f00898ffe31b1b987be17520093537c0f92301125290a04b18dfa242df6d0ad045ef2',
    debe_cambiar_password = true,
    actualizado_en = now()
where username = 'Director1';

\echo '===== Director1 reseteado a "password" (pedirá cambiarla al entrar) ====='
select username, debe_cambiar_password, actualizado_en from usuarios where username = 'Director1';
