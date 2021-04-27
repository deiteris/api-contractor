/** @type {import('eslint').Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
    "extends": [
        "@open-wc/eslint-config",
        "eslint-config-prettier"
    ],
    "overrides": [{
        "files": [
            "src/**/*.js",
        ],
        "rules": {
            "semi": [2, "always"],
            "no-console": "off",
            "no-plusplus": "off",
            "no-param-reassign": "off",
            "class-methods-use-this": "off",
            "import/no-extraneous-dependencies": "off"
        }
    }]
}