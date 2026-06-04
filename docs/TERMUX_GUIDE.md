# TERMUX_GUIDE · ObradORR 1.0.0-rc.20

## Prueba local en Termux

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_rc20_test
mkdir -p ~/obradorr_rc20_test

cp ~/storage/downloads/ObradORR_1_0_0_RC20.zip ~/obradorr_rc20_test/
cd ~/obradorr_rc20_test

sha256sum ObradORR_1_0_0_RC20.zip
unzip -q ObradORR_1_0_0_RC20.zip
cd ObradORR_1_0_0_RC20

python -c "import sqlite3; con=sqlite3.connect('db/obradorr.sqlite'); print('integrity_check:', con.execute('PRAGMA integrity_check').fetchone()[0]); print('foreign_key_check:', con.execute('PRAGMA foreign_key_check').fetchall()); print('culinary:', con.execute('SELECT release_status, COUNT(*) FROM culinary_recipes GROUP BY release_status').fetchall()); print('bakery:', con.execute('SELECT release_status, COUNT(*) FROM bakery_recipes GROUP BY release_status').fetchall()); print('reviews:', con.execute('SELECT COUNT(*) FROM recipe_documentary_reviews').fetchone()[0]); print('b4:', con.execute("SELECT COUNT(*) FROM recipe_documentary_reviews WHERE id LIKE 'REV_B4_%_RC16'").fetchone()[0])"

python -m http.server 8807 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc20
```

Reset local si venías de otra versión:

```text
http://127.0.0.1:8807/app/reset_local_data.html?v=obradorr-100-rc20
```


## Prueba funcional RC20

1. Entrar en **Imprimir / exportar**.
2. Añadir una ficha con subreceta, por ejemplo **Albóndigas en salsa española**.
3. Perfil **Aula-taller** + marcar **Mostrar costes**: el PDF debe mostrar columna `Coste` y coste estimado.
4. Perfil **Docente producción** + desmarcar **Mostrar costes**: el PDF no debe mostrar columna `Coste` ni totales.
5. Perfil **Auditoría completa** + desmarcar **Mostrar APPCC docente**: el PDF no debe mostrar la tabla APPCC completa, pero debe conservar una nota mínima de seguridad documental.
6. Perfil **Aula-taller** + marcar **Mostrar APPCC docente**: el PDF debe mostrar APPCC breve.
