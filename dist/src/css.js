'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @file wxss convert css
 * @author yican
 */

var glob = require('glob');
var utils = require('./util/index');
var chalk = require('chalk');
var path = require('path');

exports.transformCssContent = function transformCssContent(content) {
    // 无请求头的css静态资源url添加https请求头
    content = utils.transformCssStaticUrl(content);
    return content.replace(/\.wxss/ig, '.css');
};

exports.transformCss = /*#__PURE__*/_regenerator2.default.mark(function transformCss(form) {
    var files, content, i;
    return _regenerator2.default.wrap(function transformCss$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.next = 2;
                    return new _promise2.default(function (resolve) {
                        var filePath = form.dist;
                        var ext = form.type === 'wxmp2swan' ? 'css' : 'wxss';
                        // 添加支持单一文件入口逻辑
                        if (utils.isDirectory(filePath)) {
                            filePath = filePath + '/**/*.' + ext;
                        }
                        var extname = path.extname(filePath);
                        if (extname === '.' + ext) {
                            glob(filePath, function (err, files) {
                                resolve(err ? [] : files);
                            });
                        } else {
                            resolve([]);
                        }
                    });

                case 2:
                    files = _context.sent;
                    content = void 0;
                    i = 0;

                case 5:
                    if (!(i < files.length)) {
                        _context.next = 15;
                        break;
                    }

                    _context.next = 8;
                    return utils.getContent(files[i]);

                case 8:
                    content = _context.sent;

                    content = exports.transformCssContent(content);
                    _context.next = 12;
                    return utils.saveFile(files[i], content);

                case 12:
                    i++;
                    _context.next = 5;
                    break;

                case 15:
                    console.log(chalk.cyan('👉    Successfully transform wxss file'));

                case 16:
                case 'end':
                    return _context.stop();
            }
        }
    }, transformCss, this);
});