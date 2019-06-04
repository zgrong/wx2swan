/**
 * @file transform json
 * @author hiby
 */

'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends3 = require('babel-runtime/helpers/extends');

var _extends4 = _interopRequireDefault(_extends3);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _ = require('lodash');
var glob = require('glob');
var chalk = require('chalk');
var detectIntent = require('detect-indent');

var utils = require('../util');
var componentConf = require('../../config/wxmp2swan/component');
var log = require('../util/log');
var path = require('path');

/**
 * 转换一个JSON文件
 *
 * @param {string} path 文件路径
 * @param {string} contents 文件内容
 * @return {Promise.<VFile>}
 */
module.exports.transform = function (path, contents) {
    var vfile = utils.toVFile(path, contents);
    var indent = detectIntent(contents).indent || '  ';
    var json = {};
    try {
        json = JSON.parse(contents);
    } catch (err) {
        vfile.message('Invalid config file');
    }

    // 处理自定义组件log
    componentLog(json, path);

    var isComponentNameTransformed = false;
    var componentRenameMap = {};
    if (json.usingComponents) {
        // 为了保留原始的usingComponents中组件定义顺序
        var newUsingComponents = {};
        (0, _keys2.default)(json.usingComponents).forEach(function (name) {
            if (/[A-Z_]/.test(name)) {
                isComponentNameTransformed = true;

                var newName = _.kebabCase(name);
                componentRenameMap[name] = newName;
                newUsingComponents[newName] = json.usingComponents[name];
            } else {
                newUsingComponents[name] = json.usingComponents[name];
            }
        });
        json.usingComponents = newUsingComponents;
    }

    if (isComponentNameTransformed) {
        vfile.data.isComponentNameTransformed = true;
        vfile.data.componentRenameMap = componentRenameMap;
        vfile.contents = (0, _stringify2.default)(json, null, indent);
    }
    return _promise2.default.resolve(vfile);
};

/**
 * 转换配置
 *
 * @param {Object} context 转换上下文
 */
module.exports.transformConfig = /*#__PURE__*/_regenerator2.default.mark(function transformConfig(context) {
    var files, i, content, result, _result$data, isComponentNameTransformed, componentRenameMap;

    return _regenerator2.default.wrap(function transformConfig$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.next = 2;
                    return new _promise2.default(function (resolve) {
                        var filePath = context.dist;
                        // 添加支持单一文件入口逻辑
                        if (utils.isDirectory(filePath)) {
                            filePath = filePath + '/**/*.json';
                        }
                        var extname = path.extname(filePath);
                        if (extname === '.json') {
                            glob(filePath, function (err, res) {
                                resolve(err ? [] : res);
                            });
                        } else {
                            resolve([]);
                        }
                    });

                case 2:
                    files = _context.sent;
                    i = 0;

                case 4:
                    if (!(i < files.length)) {
                        _context.next = 18;
                        break;
                    }

                    _context.next = 7;
                    return utils.getContent(files[i]);

                case 7:
                    content = _context.sent;
                    _context.next = 10;
                    return exports.transform(files[i], content);

                case 10:
                    result = _context.sent;
                    _context.next = 13;
                    return utils.saveFile(files[i], String(result));

                case 13:

                    // 把重命名信息放到全局context上
                    _result$data = result.data, isComponentNameTransformed = _result$data.isComponentNameTransformed, componentRenameMap = _result$data.componentRenameMap;

                    if (isComponentNameTransformed) {
                        context.data.renamedComponents = (0, _extends4.default)({}, context.data.renamedComponents || {}, (0, _defineProperty3.default)({}, files[i], componentRenameMap));
                    }

                case 15:
                    i++;
                    _context.next = 4;
                    break;

                case 18:
                    console.log(chalk.cyan('👉    Successfully transform config file'));

                case 19:
                case 'end':
                    return _context.stop();
            }
        }
    }, transformConfig, this);
});

/**
 * 自定义组件中不支持的属性打印error日志
 *
 * @param {string} json 自定义组件json配置
 * @param {string} path 文件路径
 */
function componentLog(json, path) {
    // 处理自定义组件json中不支持的属性
    (0, _keys2.default)(componentConf.json).forEach(function (attr) {
        var confValue = componentConf.json[attr];
        if (confValue === null && json[attr]) {
            log.logger({
                type: 'Compsonent json',
                file: path,
                message: '\u81EA\u5B9A\u4E49\u7EC4\u4EF6---json[' + attr + ']: ' + '不支持的属性'
            }, 'error');
        }
    });
}