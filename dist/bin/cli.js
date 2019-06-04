#!/usr/bin/env node
'use strict';

/**
 * @file wxml convert swan
 * @author yican
 */
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var pkg = require('../package.json');
var wxmp2swan = require('../index');
var chalk = require('chalk');

var usage = 'Usage:\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('<entry-directory>') + '\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('<entry-directory>') + ' ' + chalk.green('[output-directory]') + ' ' + chalk.green('[log-directory]') + '\n        or:\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('<entry-file>') + '\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('<entry-file>') + ' ' + chalk.green('{output-directory | output-file}') + ' ' + chalk.green('[log-directory]') + '\n\n    For example:\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('./test/demo') + '\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('./test/demo') + ' ' + chalk.green('./test/swanDemo') + '\n        or:\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('./test/demo.js') + '\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('./test/demo.js') + ' ' + chalk.green('./test') + '\n        ' + chalk.cyan('wx2swan') + ' ' + chalk.green('./test/demo.wxml') + ' ' + chalk.green('./test/rename-demo.swan');
if (argv.V || argv.version) {
    console.log(chalk.green(pkg.version));
    process.exit(0);
}
if (argv.h || argv.help) {
    var helpOptions = '\n    ' + usage + '\n\n        Only ' + chalk.green('<entry-directory>') + ' and ' + chalk.green('<entry-file>') + ' is required\n\n    Options:\n        -V, --version                            output the version number\n        -h, --help                               output usage information\n    If you have any problems, do not hesitate to file an issue:\n    ' + chalk.cyan('https://github.com/yican008/wx2swan/issues/new') + '\n\n    ' + chalk.cyan('搬家工具小助手微信号：wx2swan-helper') + '\n    ';
    console.log(helpOptions);
    process.exit(0);
}
if (argv._.length < 1) {
    console.log('\n    Please specify the entry directory or file:\n\n    ' + usage + '\n\n    Run ' + chalk.cyan('wx2swan --help') + ' to see all options.\n    ');

    // console.log(chalk.redBright(
    //     `🚀     params error: wx2swan 微信小程序目录（swan目录）
    //                 如: wx2swan ./test/demo ./test/swanDemo
    //                 或者: wx2swan ./test/demo`));
    process.exit(1);
} else {
    var fromPath = path.resolve(argv._[0]);
    var toPath = argv._[1] ? path.resolve(argv._[1]) : null;
    var logPath = argv._[2] ? path.resolve(argv._[2]) : null;

    wxmp2swan({ type: 'wxmp2swan', src: fromPath, dist: toPath, log: logPath }, function (err, logs) {
        if (err) {
            console.log('err: ', err);
        }
    });
}