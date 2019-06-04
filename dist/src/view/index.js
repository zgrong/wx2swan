/**
 * @file wxml convert swan
 * @author yican, hiby
 */

'use strict';

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _ = require('lodash');
var glob = require('glob');
var path = require('path');
var chalk = require('chalk');
var unified = require('unified');
var DepGraph = require('dependency-graph').DepGraph;

var parse = require('./plugins/parse');
var stringify = require('./plugins/stringify');
var wxmlToSwan = require('./plugins/wxml-to-swan');
var utils = require('../util');
var getHtmlParser = require('./util').getHtmlParser;

/**
 * 转换一个视图文件
 *
 * @param {string} path 文件路径
 * @param {string} contents 文件内容
 * @param {Object} context 上下文
 * @return {Promise.<VFile>}
 */
module.exports.transformViewContent = function (path, contents, context) {
    return unified().use(parse).use(wxmlToSwan, { context: context }).use(stringify).process(utils.toVFile(path, contents));
};

/**
 * 转换视图
 *
 * @param {Object} context 转换上下文
 */
module.exports.transformView = /*#__PURE__*/_regenerator2.default.mark(function transformView(context) {
    var files, i, content, result;
    return _regenerator2.default.wrap(function transformView$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.next = 2;
                    return new _promise2.default(function (resolve) {
                        var filePath = context.dist;
                        // 添加支持单一文件入口逻辑
                        if (utils.isDirectory(filePath)) {
                            filePath = filePath + '/**/*.swan';
                        }
                        var extname = path.extname(filePath);
                        if (extname === '.swan') {
                            glob(filePath, function (err, res) {
                                resolve(err ? [] : res);
                            });
                        } else {
                            resolve([]);
                        }
                    });

                case 2:
                    files = _context.sent;


                    context.data.swanToRenamedComponents = buildSwanComponentDepdencies(files, context);

                    i = 0;

                case 5:
                    if (!(i < files.length)) {
                        _context.next = 17;
                        break;
                    }

                    _context.next = 8;
                    return utils.getContent(files[i]);

                case 8:
                    content = _context.sent;
                    _context.next = 11;
                    return exports.transformViewContent(files[i], content, context);

                case 11:
                    result = _context.sent;
                    _context.next = 14;
                    return utils.saveFile(files[i], String(result));

                case 14:
                    i++;
                    _context.next = 5;
                    break;

                case 17:
                    console.log(chalk.cyan('👉    Successfully transform wxml file'));

                case 18:
                case 'end':
                    return _context.stop();
            }
        }
    }, transformView, this);
});

/**
 * 构造视图到被修改名称的自定义组件的依赖树
 *
 * @param {Array.<string>} files 视图文件集合
 * @param {Object} context 转化工具上下文
 * @return {Object}
 */
function buildSwanComponentDepdencies(files, context) {
    var _getHtmlParser = getHtmlParser(),
        htmlParser = _getHtmlParser.htmlParser,
        handler = _getHtmlParser.handler;

    var swanDependencyGraph = files.reduce(function (graph, file) {
        graph.addNode(file);
        htmlParser.end(utils.getContentSync(file));
        var tree = handler.dom;
        buildGraph(tree, graph, file);
        htmlParser.reset();
        return graph;
    }, new DepGraph());

    return (0, _keys2.default)(context.data.renamedComponents || {})
    // 有使用自定义组件、且有不合法自定义组件名称的swan文件，主要包括页面和自定义组件
    .map(function (key) {
        return key.replace(/\.json$/, '.swan');
    }).filter(function (file) {
        return swanDependencyGraph.hasNode(file);
    })
    // 找出页面和自定义组件视图依赖的所有视图
    .map(function (file) {
        return {
            file: file,
            deps: swanDependencyGraph.dependenciesOf(file)
        };
    })
    // 找出页面、自定义组件视图以及以上两者使用的视图文件使用的被改名的自定义组件map
    .reduce(function (prev, _ref) {
        var file = _ref.file,
            deps = _ref.deps;

        var jsonFileName = file.replace(/\.swan/, '.json');
        var renamedMap = context.data.renamedComponents[jsonFileName] || {};
        deps.forEach(function (dep) {
            return prev[dep] = prev[dep] ? (0, _extends3.default)({}, prev[dep], renamedMap) : renamedMap;
        });
        prev[file] = renamedMap;
        return prev;
    }, {});
}

/**
 * 构造一个视图文件节点的依赖图
 *
 * @param {Object} tree 视图树
 * @param {DepGraph} graph 视图文件依赖图
 * @param {string} from 视图文件节点
 */
function buildGraph(tree, graph, from) {
    if (!_.isArray(tree)) {
        var type = tree.type,
            name = tree.name,
            attribs = tree.attribs,
            _tree$children = tree.children,
            children = _tree$children === undefined ? [] : _tree$children;

        if (type === 'tag' && (name === 'import' || name === 'include') && attribs.src) {
            var dep = path.resolve(path.dirname(from), attribs.src);
            dep = dep.replace(/\.wxml/, '.swan');
            dep = dep.endsWith('.swan') ? dep : dep + '.swan';
            graph.addNode(dep);
            graph.addDependency(from, dep);
        }
        buildGraph(children, graph, from);
        return;
    }
    tree.forEach(function (node) {
        return buildGraph(node, graph, from);
    });
}