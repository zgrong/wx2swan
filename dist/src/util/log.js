'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @file 转换日志
 * @description 记录转换日志相关方法
 * @author zhengjiaqi01@baidu.com
 * 2018/09/20
 */
var utils = require('./index');
var chalk = require('chalk');

var errorCount = 1;
var logStore = {
    info: [],
    warning: [],
    error: []
};

var logFnMap = {
    info: function info(log) {
        logStore.info.push(log);
    },
    warning: function warning(log) {
        logStore.warning.push(log);
    },
    error: function error(log) {
        logStore.error.push(log);
    }
};

exports.logger = function (log, level) {
    handleErrorLog(log, level);
    handleWarningLog(log, level);
    logFnMap[level](log);
};

function handleErrorLog(log, level) {
    if (level !== 'error') {
        return;
    }
    console.log(chalk.keyword('orange')(' \uD83D\uDC94  ' + errorCount++ + '  ' + chalk.redBright('[ERROR]:') + ' ' + log.file + ':----row:' + log.row + '-column:' + log.column + ':'));
    console.log(chalk.redBright('      ' + log.message));
    console.log('--------------------------------------------------------');
}

function handleWarningLog(log, level) {
    if (level !== 'warning') {
        return;
    }
    console.log(chalk.keyword('orange')(' \u26A0\uFE0F     ' + chalk.yellow('[WARNING]:') + ' ' + log.file + ':----row:' + log.row + '-column:' + log.column + ':'));
    console.log(chalk.yellow('      ' + log.message));
    console.log('--------------------------------------------------------');
}

exports.saveLog = function (path) {
    (0, _keys2.default)(logStore).forEach(function (level) {
        var logs = logStore[level];
        utils.saveLog(path + '/log/' + level + '.json', (0, _stringify2.default)(logs, null, 4));
    });
};