# Circunferencia modular

Visualizador interactivo de la **circunferencia de multiplicación modular** (*times table cardioid*).

Se reparten **N** puntos sobre una circunferencia y cada punto `i` se une con el punto `(i · m) mod N`. La envolvente de esas líneas forma una cardioide (m = 2), una nefroide (m = 3) y, en general, epicicloides con m − 1 lóbulos, además de patrones tipo mandala para otros valores.

## Uso

Abre `index.html` en el navegador (no requiere instalación).

- Cambia **N** y **m** con los deslizadores o escribiendo el valor (m admite decimales).
- Figuras predefinidas: cardioide, nefroide, 21, 29, 33, 34, 51…
- **Animar m** para ver cómo una figura se transforma en la siguiente.
- Colores por índice, por longitud de línea o color único; opacidad, grosor y fondo.
- **Guardar PNG** en 1080, 2048 o 4096 px.

Atajos: `Espacio` animar · `←` `→` m ±0.01 (`Shift` ±1) · `↑` `↓` N ±1 (`Shift` ±10) · `S` guardar.

## Nota matemática

Dos multiplicadores dan exactamente la misma figura si `m ≡ m' (mod N)` o si `m · m' ≡ 1 (mod N)`. Por eso, para m = 2…28, el menor N sin figuras repetidas es 48.
