const fs = require('fs');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

walk(path.join(process.cwd(), 'src', 'app'), function(err, results) {
  if (err) throw err;
  const filesToCheck = results.filter(f => f.endsWith('page.tsx') || f.endsWith('route.ts'));
  let modifiedCount = 0;
  for (const file of filesToCheck) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('createClient') || content.includes('createAdminClient') || content.includes('@supabase/ssr')) {
      if (!content.includes("export const dynamic = 'force-dynamic'") && !content.includes('export const dynamic="force-dynamic"')) {
        content = "export const dynamic = 'force-dynamic';\n" + content;
        fs.writeFileSync(file, content);
        console.log('Added force-dynamic to', file);
        modifiedCount++;
      }
    }
  }
  console.log('Total modified:', modifiedCount);
});
