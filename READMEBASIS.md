# Basis technologies publishing

## setup

Your .npmrc needs to contain:

* a key entry for the ca key root
* a login token for [our local registry](https://npm.bti.local/)

You can get this running:

```bash
npm config set cafile ./root_ca.crt 
npm login --registry https://npm.bti.local  
```

## publish

To publish the extension in the basis technologies repository:

1) bump the version in package.json:

Can be done with CLI:

````bash
npm version patch
```

...or manually:

```json
{
    "version": "4.0.5"
}
```


2) publish it:

   ```bash
   ts-node publish.ts
   ```

Keep in mind basis version is fake: 4.0 is based on 3.0.11
