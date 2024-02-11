const s = Bun.argv[2];
const re = new RegExp(
  'Photo by <a href="(.+)">(.+)</a> on <a href="(.+)">(.+)</a>',
);
const a = re.exec(s);
console.log(
  [
    ["photoByName", a[2]],
    ["photoByUrl", a[1]],
    ["photoOnName", a[4]],
    ["photoOnUrl", a[3]],
  ]
    .map(x => `${x[0]}: "${x[1]}"`)
    .join("\n"),
);
