#!/usr/bin/env node

/**
 * @file wxml convert swan
 * @author yican
 */
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const pkg = require('../package.json');
const wxmp2swan = require('../index');
const chalk = require('chalk');

const usage = `Usage:
        ${chalk.cyan('wx2swan')} ${chalk.green('<entry-directory>')}
        ${chalk.cyan('wx2swan')} ${chalk.green('<entry-directory>')} ${chalk.green('[output-directory]')} ${chalk.green('[log-directory]')}
        or:
        ${chalk.cyan('wx2swan')} ${chalk.green('<entry-file>')}
        ${chalk.cyan('wx2swan')} ${chalk.green('<entry-file>')} ${chalk.green('{output-directory | output-file}')} ${chalk.green('[log-directory]')}

    For example:
        ${chalk.cyan('wx2swan')} ${chalk.green('./test/demo')}
        ${chalk.cyan('wx2swan')} ${chalk.green('./test/demo')} ${chalk.green('./test/swanDemo')}
        or:
        ${chalk.cyan('wx2swan')} ${chalk.green('./test/demo.js')}
        ${chalk.cyan('wx2swan')} ${chalk.green('./test/demo.js')} ${chalk.green('./test')}
        ${chalk.cyan('wx2swan')} ${chalk.green('./test/demo.wxml')} ${chalk.green('./test/rename-demo.swan')}`;
if (argv.V || argv.version) {
    console.log(chalk.green(pkg.version));
    process.exit(0);
}
if (argv.h || argv.help) {
    const helpOptions = `
    ${usage}

        Only ${chalk.green('<entry-directory>')} and ${chalk.green('<entry-file>')} is required

    Options:
        -V, --version                            output the version number
        -h, --help                               output usage information
    If you have any problems, do not hesitate to file an issue:
    ${chalk.cyan('https://github.com/yican008/wx2swan/issues/new')}

    ${chalk.cyan('搬家工具小助手微信号：wx2swan-helper')}
    `;
    console.log(helpOptions);
    process.exit(0);
}
if (argv._.length < 1) {
    console.log(`
    Please specify the entry directory or file:

    ${usage}

    Run ${chalk.cyan('wx2swan --help')} to see all options.
    `);

    // console.log(chalk.redBright(
    //     `🚀     params error: wx2swan 微信小程序目录（swan目录）
    //                 如: wx2swan ./test/demo ./test/swanDemo
    //                 或者: wx2swan ./test/demo`));
    process.exit(1);
}
else {
    const fromPath = path.resolve(argv._[0]);
    const toPath = argv._[1] ? path.resolve(argv._[1]) : null;
    const logPath = argv._[2] ? path.resolve(argv._[2]) : null;

    wxmp2swan({type: 'wxmp2swan', src: fromPath, dist: toPath, log: logPath}, function (err, logs) {
        if (err) {
            console.log('err: ', err);
        }
    });
}
