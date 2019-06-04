'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @file wxml convert swan
 * @author yican
 */

var path = require('path');
var co = require('co');
var chalk = require('chalk');
var json = require('./src/config');
var api = require('./src/api');
var view = require('./src/view');
var css = require('./src/css');
var utils = require('./src/util/index');
var log = require('./src/util/log');

module.exports = function wxmp2swan(pathObj, cb) {
    // 指定转换目录
    pathObj.dist = pathObj.dist || getDefaultDist(pathObj.src);
    var defultLog = pathObj.dist || pathObj.src;
    // dist为文件路径时默认日志目录为此文件目录
    if (!utils.isDirectory(defultLog)) {
        defultLog = path.dirname(defultLog);
    }
    pathObj.log = pathObj.log || defultLog;
    pathObj.type = pathObj.type || 'wxmp2swan';
    var context = (0, _extends3.default)({}, pathObj, {
        logs: [],
        // 可以放一些全局共享的数据
        data: {
            // 重命名组件数据存储
            // renamedComponents: {file: {[oldName]: newName}}
            //
        }
    });
    console.log(chalk.yellow('📦    Transforming workspace files...'));
    co( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return utils.copyProject(pathObj.src, pathObj.dist);

                    case 2:
                        _context.next = 4;
                        return json.transformConfig(context);

                    case 4:
                        _context.next = 6;
                        return api.transformApi(context);

                    case 6:
                        _context.next = 8;
                        return view.transformView(context);

                    case 8:
                        _context.next = 10;
                        return css.transformCss(context);

                    case 10:
                        _context.next = 12;
                        return utils.createWx2swaninfo(pathObj.dist);

                    case 12:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    })).then(function () {
        log.saveLog(pathObj.log);
        // utils.saveLog(`${pathObj.log}/log.json`, JSON.stringify(context.logs, null, 4));
        cb && cb(null);
        console.log(chalk.green('🎉    Ok, transform done, check transform log in ') + chalk.blue.underline.bold('log.json'));
    }).catch(function (e) {
        cb && cb(e);
        console.log(chalk.red('🚀    run error: ', e));
    });
};

function getDefaultDist(dist) {
    var res = '';
    if (utils.isDirectory(dist)) {
        res = path.join(path.dirname(dist), path.basename(dist) + '_swan');
    } else {
        res = path.join(path.dirname(dist) + '_swan', path.basename(dist));
    }
    return res;
}