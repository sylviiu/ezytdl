const buttonDisabledAnim = (m, extraOpt) => {
    anime.remove(m);
    m.style.position = `relative`
    anime(Object.assign({}, {
        targets: m,
        left: [0.75, -0.65, 0.55, -0.45, 0.35, -0.25, 0.15, -0.05, 0].map(v => `${v*5}px`),
        duration: 300,
    }, typeof extraOpt == `object` ? extraOpt : {}))
}