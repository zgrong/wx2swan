/**
 * wxml to swan转换插件
 *
 * @file wxml to swan转换插件
 * @author yican, hiby
 */

'use strict';

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _extends3 = require('babel-runtime/helpers/extends');

var _extends4 = _interopRequireDefault(_extends3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _ = require('lodash');
var path = require('path');
var regexgen = require('regexgen');
var tranformBindDataConifg = require('../../../tranform-bind-data-conifg');
var utils = require('../../util');

module.exports = function wxmlToSwan() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    return transform;

    function transform(tree, file) {
        transformTree(tree, file);
    }

    function transformTree(tree, file) {
        if (_.isArray(tree)) {
            return tree.map(function (node) {
                return transformTree(node, file);
            });
        }
        if (tree.type === 'tag') {
            var _tree = tree,
                name = _tree.name,
                attribs = _tree.attribs,
                children = _tree.children;


            if (name === 'import' || name === 'include') {
                tree = tranformImport(tree, file, options);
            }

            // template data属性的值需要包一层花括号
            if (name === 'template' && attribs.data) {
                tree = tranformTemplate(tree, file, options);
            }

            // input标签强制自闭合
            if (name === 'input') {
                tree = tranformInput(tree, file, options);
            }

            tree = tranformBindData(tree, file, options);

            tree = tranformOnEventBind(tree, file, options);

            tree = transformComponent(tree, file, options);

            tree.children = children.map(function (node) {
                return transformTree(node, file);
            });

            tree = transformDirective(tree, file, options);

            // 无请求头的css静态资源url添加https请求头
            tree = transformStyle(tree, file, options);

            // 一定要在transform children和transformDirective之后
            var transformedAttribs = tree.attribs;
            if (transformedAttribs['s-for'] && transformedAttribs['s-if']) {
                tree = transformForIFDirective(tree, file, options);
            }
        }
        return tree;
    }
};

/**
 * 转换import和include标签
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function tranformImport(node, file, options) {
    var attribs = node.attribs;
    if (attribs && attribs.src) {
        var src = attribs.src.replace(/\.wxml$/i, '.swan');
        // src中没有扩展名的添加默认扩展名.swan
        if (!/\w+\.\w+$/.test(src)) {
            src = src + '.swan';
        }
        return (0, _extends4.default)({}, node, {
            attribs: (0, _extends4.default)({}, attribs, {
                src: src
            })
        });
    }
    return node;
}

/**
 * 转换模板标签
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function tranformTemplate(node, file, options) {
    var attribs = node.attribs;
    if (attribs && attribs.data) {
        return (0, _extends4.default)({}, node, {
            attribs: (0, _extends4.default)({}, attribs, {
                data: '{' + attribs.data + '}'
            })
        });
    }
    return node;
}

/**
 * 转换input标签
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function tranformInput(node, file, options) {
    if (!node.selfclose) {
        file.message('remove input close tag');
        return (0, _extends4.default)({}, node, {
            selfclose: true
        });
    }
    return node;
}

/**
 * 转换自定义组件
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function transformComponent(node, file, options) {
    var filePath = path.resolve(file.cwd, file.dirname, file.basename);
    var swanToRenamedComponents = options.context.data.swanToRenamedComponents || {};
    var renamedComponentMap = swanToRenamedComponents[filePath];
    if (renamedComponentMap && renamedComponentMap[node.name]) {
        // @TODO: 添加warning日志
        return (0, _extends4.default)({}, node, {
            name: renamedComponentMap[node.name]
        });
    }
    return node;
}

/**
 * 转换标签上的directive
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function transformDirective(node, file, options) {
    var attribs = node.attribs,
        _node$singleQuoteAttr = node.singleQuoteAttribs,
        singleQuoteAttribs = _node$singleQuoteAttr === undefined ? {} : _node$singleQuoteAttr;

    if (!attribs) {
        return node;
    }
    var newAttribs = (0, _keys2.default)(attribs).reduce(function (newAttribs, key) {
        // 删除空wx:前缀
        var newKey = key.replace(/^wx:$/, '').replace(/^wx:/, 's-');
        newKey = key === 'wx:for-items' ? 's-for' : newKey;
        var value = attribs[key];
        var newValue = value;
        // 去除花括号
        if (['wx:for', 'wx:if', 'wx:elif', 'wx:for-items'].includes(key)) {
            newValue = dropBrackets(value);
        }
        // 合并wx:for wx:for-items wx:for-item wx:for-index
        if (key === 'wx:for' || key === 'wx:for-items') {
            var item = attribs['wx:for-item'] || 'item';
            var index = attribs['wx:for-index'] || 'index';
            newValue = item + ', ' + index + ' in ' + newValue;
        }

        // 丢弃这俩
        if (['wx:for-index', 'wx:for-item'].includes(key)) {
            return newAttribs;
        }

        newAttribs[newKey] = newValue;
        return newAttribs;
    }, {});
    return (0, _extends4.default)({}, node, {
        attribs: newAttribs,
        singleQuoteAttribs: (0, _keys2.default)(singleQuoteAttribs).reduce(function (prev, key) {
            var newKey = key.replace(/^wx:/, 's-');
            return (0, _extends4.default)({}, prev, (0, _defineProperty3.default)({}, newKey, singleQuoteAttribs[key]));
        }, {})
    });
}

/**
 * 丢掉属性值两侧的花括号
 *
 * @param {string} value 属性值
 * @return {string}
 */
function dropBrackets() {
    var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    var trimed = value.trim();
    if (/^{{.*}}$/.test(trimed)) {
        return trimed.slice(2, -2);
    }
    return value;
}

/**
 * 判断是否{{}}数据绑定
 *
 * @param {string} value 属性值
 * @return {boolean}
 */
function hasBrackets() {
    var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    var trimed = value.trim();
    return (/^{{.*}}$/.test(trimed)
    );
}

/**
 * 转换标签上的for if directive
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function transformForIFDirective(node, file, options) {
    var attribs = node.attribs,
        children = node.children;

    var ifValue = attribs['s-if'];
    var forValue = attribs['s-for'];

    var _forValue$slice$split = forValue.slice(0, forValue.indexOf(' in ')).split(','),
        _forValue$slice$split2 = (0, _slicedToArray3.default)(_forValue$slice$split, 2),
        forItemName = _forValue$slice$split2[0],
        forIndexName = _forValue$slice$split2[1];

    var forItemNameRegex = getVariableRegex(forItemName);
    var forIndexNameRegex = getVariableRegex(forIndexName);

    var shouldBeAfterFor = forItemNameRegex.test(ifValue) || forIndexNameRegex.test(ifValue);
    if (shouldBeAfterFor) {
        var blockNode = {
            type: 'tag',
            name: 'block',
            attribs: {
                's-if': ifValue
            },
            children: children,
            parent: node
        };
        delete node.attribs['s-if'];
        node.children = [blockNode];
        blockNode.children = blockNode.children.map(function (item) {
            return (0, _extends4.default)({}, item, {
                parent: blockNode
            });
        });
    }
    return node;
}

/**
 * 生成匹配变量名的正则表达式
 *
 * @param {string} variable 变量名
 * @return {RegExp}
 */
function getVariableRegex(variable) {
    if (variable[0] === '$') {
        var _regex = regexgen([variable.slice(1)]);
        return new RegExp('\\$' + _regex.toString().slice(1, -1) + '\\b');
    }
    var regex = regexgen([variable]);
    var res = new RegExp('\\b' + regex.toString().slice(1, -1) + '\\b');
    return res;
}

/**
 * 转换数据绑定为双向绑定语法
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function tranformBindData(node, file, options) {
    var tranformBindDataList = tranformBindDataConifg[node.name];
    if (!tranformBindDataList) {
        return node;
    }
    var attribs = node.attribs;
    tranformBindDataList.forEach(function (attr) {
        if (attribs && attribs[attr]) {
            if (hasBrackets(attribs[attr])) {
                node.attribs[attr] = '{=' + dropBrackets(attribs[attr]) + '=}';
            } else {
                node.attribs[attr] = '' + attribs[attr];
            }
        }
    });
    return node;
}

/**
 * 将使用on进行的数据绑定转换为bind进行数据绑定
 * 如: ontap -> bindtap
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function tranformOnEventBind(node, file, options) {
    var attribs = node.attribs;
    (0, _keys2.default)(attribs).forEach(function (attr) {
        var value = attribs[attr];
        var matchList = attr.match(/^on(\w+)/);
        if (matchList) {
            var fnName = matchList[1] || '';
            node.attribs['bind' + fnName] = value;
            delete node.attribs[attr];
        }
    });
    return node;
}

/**
 * 转换style
 * 无请求头的css静态资源url添加https请求头
 *
 * @param {Object} node 节点对象
 * @param {VFile} file 虚拟文件
 * @param {Object} options 转换配置
 * @return {Object}
 */
function transformStyle(node, file, options) {
    var attribs = node.attribs;
    if (attribs.style) {
        attribs.style = utils.transformCssStaticUrl(attribs.style);
    }
    return node;
}