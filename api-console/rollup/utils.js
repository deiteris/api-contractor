/* eslint-disable import/no-extraneous-dependencies */
// Adopted from https://github.com/open-wc/open-wc/blob/master/packages/building-rollup/src/utils.js

import merge from 'deepmerge';

export const isFalsy = _ => !!_;

export function dedupedBabelPlugin(babel, userConfig, defaultConfig) {
    if (!userConfig) {
        return undefined;
    }

    const config = merge(defaultConfig, typeof userConfig === 'object' ? userConfig : {});

    const newPlugins = [];
    const addedPlugins = new Set();
    for (const plugin of [...config.plugins].reverse()) {
        const name = Array.isArray(plugin) ? plugin[0] : plugin;
        const resolvedName = require.resolve(name);
        if (!addedPlugins.has(resolvedName)) {
            addedPlugins.add(resolvedName);
            newPlugins.unshift(plugin);
        }
    }

    config.plugins = newPlugins;
    return babel(config);
}

export function pluginWithOptions(plugin, userConfig, defaultConfig, ...otherParams) {
    if (!userConfig) {
        return undefined;
    }

    const config = merge(defaultConfig, typeof userConfig === 'object' ? userConfig : {});
    return plugin(config, ...otherParams);
}