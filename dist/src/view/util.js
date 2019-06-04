/**
 * 视图转换模块工具
 *
 * @file 视图转换模块工具
 * @author hiby
 */

'use strict';

var _symbol = require('babel-runtime/core-js/symbol');

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('stricter-htmlparser2'),
    Parser = _require.Parser,
    DomHandler = _require.DomHandler;

// 虚拟根节点名称


module.exports.fakeRoot = (0, _symbol2.default)('fake-root');

// 获取parser和handler
module.exports.getHtmlParser = function (options) {
    options = options || {
        xmlMode: false,
        lowerCaseAttributeNames: false,
        recognizeSelfClosing: true,
        lowerCaseTags: false
    };
    var handler = new DomHandler();
    var htmlParser = new Parser(handler, options);
    return { htmlParser: htmlParser, handler: handler };
};