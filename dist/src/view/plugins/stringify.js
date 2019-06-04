/**
 * 视图ast序列化插件
 *
 * @file 视图ast序列化插件
 * @author yican, hiby
 */

'use strict';

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var viewConfig = require('../../../config/wxmp2swan/view');
var FAKE_ROOT = require('../util').fakeRoot;

var SINGLE_QUOTE = '\'';
var DOUBLE_QUOTE = '"';

// 把标签名、属性片段join起来
var join = function join() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    return args.filter(function (arg) {
        return !!arg;
    }).join(' ');
};

module.exports = function stringify() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    this.Compiler = compiler;

    function compiler(tree, file) {
        if (!tree) {
            return '';
        } else if (Array.isArray(tree)) {
            return tree.map(function (node) {
                return compiler(node, file);
            }).join('');
        }

        var type = tree.type,
            children = tree.children,
            data = tree.data;

        switch (type) {
            case 'tag':
                {
                    // 跳过虚假的根节点
                    if (tree.name === FAKE_ROOT) {
                        return compiler(children, file);
                    }
                    var content = children.map(function (node) {
                        return compiler(node, file);
                    }).join('');
                    return nodeToString(tree, content, file);
                }
            case 'text':
                return data;
            case 'comment':
                return '<!--' + data + '-->';
        }
    }
};

/**
 * 生成tag节点的字符串
 *
 * @param {Object} node tag节点
 * @param {string} content 子元素字符串
 * @param {VFile} file 文件描述
 * @return {string}
 */
function nodeToString(node, content, file) {
    var name = node.name,
        attribs = node.attribs,
        _node$singleQuoteAttr = node.singleQuoteAttribs,
        singleQuoteAttribs = _node$singleQuoteAttr === undefined ? {} : _node$singleQuoteAttr,
        selfclose = node.selfclose;

    var stringAttribs = attribsToString(attribs, singleQuoteAttribs, file);
    return selfclose ? '<' + join(name, stringAttribs) + ' />' : '<' + join(name, stringAttribs) + '>' + content + '</' + name + '>';
}

/**
 * 生成tag节点属性的字符串
 *
 * @param {Object} attribs tag节点属性集合
 * @param {Object} singleQuoteAttribs tag节点使用单引号的属性集合
 * @param {VFile} file 文件描述
 * @return {string}
 */
function attribsToString(attribs, singleQuoteAttribs, file) {
    if (!attribs) {
        return '';
    }

    return (0, _keys2.default)(attribs).map(function (key) {
        var value = attribs[key];
        if (value === '') {
            if (viewConfig.boolAttr.includes(key)) {
                return key + '="false"';
            }
            return key;
        }
        var quote = singleQuoteAttribs[key] ? SINGLE_QUOTE : DOUBLE_QUOTE;
        if (quote === DOUBLE_QUOTE && value.indexOf('\\"') >= 0) {
            value = value.replace(/\\"/g, '\'');
            file.message('Danger \\" in attribute value');
        }
        if (key !== '') {
            return key + '=' + quote + value + quote;
        } else {
            return '' + key;
        }
    }).join(' ');
}