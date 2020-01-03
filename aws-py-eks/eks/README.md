This folder will eventually be published as the `pulumi_eks` Python package on PyPI, a simple proxy
wrapper that embeds the required Node package.

Note that currently, `npm install` must be run in this folder manually to populate the
`node_modules` folder.  A solution will be needed to auotmatically do that at Pyton package
installation time (or to shrinkwrap install the NodeJS package - though native dependencies could
make that options more difficult).