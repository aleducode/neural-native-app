# Pedido al backend — posiciones únicas en el ranking

**Endpoint:** `GET /api/v1/community/leaderboard/`

## Qué hay que cambiar

El ranking no puede tener **posiciones repetidas**.

Hoy usa ranking de competencia: a igual valor, igual posición. Real de producción:

```
(1, Camilo, 8) · (2, Juan, 6) · (2, Laura, 6)
```

En la app eso pinta un podio cuyas bases dicen `2 · 1 · 2`, y más abajo cuatro
socios seguidos marcados todos como `4`. Se lee como un error aunque el dato
sea correcto.

**Se necesita:** posiciones únicas y consecutivas —1, 2, 3, 4, sin repetir—
desempatando con el criterio estable que ya existe (`first_name`, `last_name`,
`id`), para que el orden no salte entre refrescos.

## La consecuencia que hay que resolver junto

Si Juan y Laura valen 6 y pasan a ser 2.º y 3.º, el `to_next` de Laura queda en
**0**: le faltan cero entrenos para alcanzar al 2.º, porque ya lo alcanzó en
valor. Y *"te faltan 0 entrenos para el 2.º"* no dice nada.

`to_next` es la pieza central del producto — es lo que hace funcionar la línea
*"te falta 1 entreno para el 3.º"* en la tira del muro.

**Opción A** — `to_next` sigue siendo el salto al siguiente valor
estrictamente mayor. Para Laura daría 3 (de 6 a 8). Honesto, pero raro: le
decís que le faltan 3 para el 2.º cuando el 2.º tiene su mismo número.

**Opción B (preferida)** — `to_next` es la diferencia con quien está justo
arriba, y puede ser 0. La app maneja el 0 con otro copy:
*"Estás empatado con Juan — uno más y lo pasás."*

La B es la verdad literal y motiva más que cualquier número.

## Confirmación menor

Que `total` siga significando socios en el ranking y no cambie con esto.

## Nota

El cambio de contrato es de una sola forma: la app ya consume `position`,
`value` y `to_next` tal como están. Solo cambia cómo se calculan.
