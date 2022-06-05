const k = 0.99999
const r = 0.9999
const d = 0.015
const h = 0.005

const hb = []

hb.push({ holderBonus: h, d, r})

for (let index = 1; index < 730; index++) {
  const nextR = hb[index - 1].r * k
  const nextD = hb[index - 1].d * nextR
  const nextHolderBonus = hb[index - 1].holderBonus + nextD

  hb.push({ holderBonus: nextHolderBonus, d: nextD, r: nextR })
}
