const { readFileSync, statSync, writeFileSync, mkdirSync } = require('fs');
const { execSync } = require('child_process');
try {
    mkdirSync('out');
} catch (error) {
    /*ignore*/
}
try {
    const cert = readFileSync('root_ca.crt').toString();
    writeFileSync('out/root_ca.crt', cert);
    const pkg = JSON.parse(readFileSync('package.json').toString());
    const binary = `atlascode-${pkg.version}.vsix`;
    if (!statSync(binary)) throw new Error(`File not found:${binary}`);
    pkg.files = [binary];
    delete pkg.private;
    delete pkg.scripts;
    pkg.publishConfig = { registry: 'https://npm.bti.local' };
    writeFileSync('out/package.json', JSON.stringify(pkg, null, 1));
    execSync(`cp ${binary} README.md out/`).toString();
    process.chdir('out');
    const res = execSync('npm publish').toString();
    console.log(res);
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
