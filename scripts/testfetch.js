const fs = require('fs');

const content = fs.readFileSync('.env.local', 'utf-8');
const env = {};
content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
    }
});

(async () => {
  try {
    console.log("Fetching: " + env.APPS_SCRIPT_URL + '?action=admin_cupones&clave=' + env.ADMIN_KEY);
    const res = await fetch(env.APPS_SCRIPT_URL + '?action=admin_cupones&clave=' + env.ADMIN_KEY);
    const text = await res.text();
    console.log("Response length:", text.length);
    console.log("Preview:", text.substring(0, 100));
  } catch(e) {
    console.error(e);
  }
})();
