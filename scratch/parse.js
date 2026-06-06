const fs = require('fs');
const path = require('path');
const dir = 'd:/Eman Thread/New folder';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
files.forEach(f => {
  console.log('--- ' + f + ' ---');
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  
  const labels = [];
  const labelRegex = /<div class="label">(.*?)<\/div>/g;
  let match;
  while ((match = labelRegex.exec(html)) !== null) {
    labels.push(match[1].replace(/<[^>]+>/g, '').trim());
  }

  const pills = [];
  const pillRegex = /<span class="pill">(.*?)<\/span>/g;
  while ((match = pillRegex.exec(html)) !== null) {
    pills.push(match[1].replace(/<[^>]+>/g, '').trim());
  }

  const subitems = [];
  const subitemRegex = /<div class="subitem">(.*?)<span/g;
  while ((match = subitemRegex.exec(html)) !== null) {
    subitems.push(match[1].replace(/<[^>]+>/g, '').trim());
  }

  console.log('Labels:', labels);
  console.log('Pills/Checks:', pills);
  console.log('Subitems:', subitems);
});
