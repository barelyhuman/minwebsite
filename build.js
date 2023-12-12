

const esbuild = require("esbuild")

esbuild.build(
    {
        entryPoints:["./assets/elements.js","./assets/themer.js"],
        outdir:"./assets/bundle",
        minify:true,
        platform:"browser"
    }
)
