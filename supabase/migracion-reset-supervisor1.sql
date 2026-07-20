-- =====================================================================
-- Finca El Salto — Reseteo de contraseña de Supervisor1 (Emerson)
-- Deja la contraseña en "password" y exige cambiarla al próximo ingreso.
-- Idempotente: se puede correr de nuevo sin problema.
-- El hash es scrypt de la palabra "password" (mismo formato que el login).
-- =====================================================================

update usuarios
set password_hash = 'scrypt:0df23e0c8bd8b21de15787c9901837f2:6eeacc8bcf44201140d8caf2b148a371eecdf5c0bef4e087971f9172a17f00898ffe31b1b987be17520093537c0f92301125290a04b18dfa242df6d0ad045ef2',
    debe_cambiar_password = true,
    actualizado_en = now()
where username = 'Supervisor1';
