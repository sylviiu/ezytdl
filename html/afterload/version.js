const getVersion = () => {
    if(document.getElementById(`version`)) {
        version.get().then(v => {
            if(isNaN(Number(v[0]))) {
                document.getElementById(`version`).innerHTML = v
                document.getElementById(`version`).style.fontSize = `0.8rem`
            } else document.getElementById(`version`).innerHTML = `v` + v
        })
    }
}

if(typeof introAnimation != `undefined`) {
    console.log(`introAnimation`, introAnimation)
    introAnimation.wait(getVersion);
} else {
    console.log(`no introAnimation`)
    getVersion()
}