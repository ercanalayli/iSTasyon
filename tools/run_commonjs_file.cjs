const fs = require('fs');
const Module = require('module');
const path = require('path');

const target = process.argv[2];
if (!target) throw new Error('CommonJS hedef dosyasi belirtilmedi.');
process.argv.splice(1, 1);

const filename = path.resolve(target);
const source = fs.readFileSync(filename, 'utf8');
const child = new Module(filename, module);
child.filename = filename;
child.paths = Module._nodeModulePaths(path.dirname(filename));
child._compile(source, filename);
