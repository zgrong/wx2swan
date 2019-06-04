'use strict';

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @file wxml convert swan
 * @author yican
 */

var fs = require('fs-extra');
var recursiveCopy = require('recursive-copy');
var mkdirp = require('mkdirp');
var path = require('path');
var vfile = require('vfile');

var swanFileSuffix = 'swan';
var cssFileSuffix = 'css';
var jsFileSuffix = 'js';
var configFileSuffix = 'json';

/**
 * 拷贝项目
 *
 * @param {string} fromPath 目标目录路径
 * @param {string} toPath 生成目录路径
 * @return {Promise}
 */
exports.copyProject = function (fromPath, toPath) {
    // 支持转换入口为单一文件
    if (isDirectory(fromPath)) {
        return copyDirectory(fromPath, toPath);
    } else {
        return copyFile(fromPath, toPath);
    }
};

/**
 * 拷贝目录
 *
 * @param {string} fromPath 目标目录路径
 * @param {string} toPath 生成目录路径
 * @return {Promise}
 */
function copyDirectory(fromPath, toPath) {
    var lists = fs.readdirSync(fromPath).filter(function (item) {
        return !/(node_modules|DS_store)/i.test(item);
    });
    var options = {
        overwrite: true,
        expand: true,
        dot: true,
        rename: function rename(filePath) {
            return renameFileExt(filePath);
        }
    };
    var arr = [];
    for (var i = 0; i < lists.length; i++) {
        arr.push(recursiveCopy(path.join(fromPath, lists[i]), path.join(toPath, lists[i].replace(/wxml$/, swanFileSuffix).replace(/wxss$/, cssFileSuffix)), options));
    }
    return _promise2.default.all(arr);
}

/**
 * 拷贝单文件
 *
 * @param {string} fromPath 目标文件路径
 * @param {string} toPath 生成文件路径
 * @return {Promise}
 */
function copyFile(fromPath, toPath) {
    // 拷贝文件时toPath支持文件与目录两种形式
    var fromfileName = path.basename(fromPath);
    if (isDirectory(toPath)) {
        // toPath为目录时补上文件名为fromPath中处理扩展名后的文件名
        fromfileName = renameFileExt(fromfileName);
        toPath = path.join(toPath, fromfileName);
    }
    return fs.copy(fromPath, toPath);
}

/**
 * 重命名文件扩展名
 *
 * @param {string} filePath 文件路径
 * @return {string} 处理后路径
 */
function renameFileExt(filePath) {
    if (/wxml/.test(filePath)) {
        return filePath.replace(/wxml$/, swanFileSuffix);
    } else if (/wxss/.test(filePath)) {
        return filePath.replace(/wxss$/, cssFileSuffix);
    } else {
        return filePath;
    }
}

/**
 * 判断路径是否为目录
 *
 * @param {string} entryPath 路径
 * @return {boolean}
 */
function isDirectory(entryPath) {
    return !path.extname(entryPath);
}
exports.isDirectory = isDirectory;

// get content
exports.getContent = function (filepath) {
    return new _promise2.default(function (resolve) {
        fs.readFile(filepath, function (err, con) {
            resolve(con.toString());
        });
    });
};

// get content sync
exports.getContentSync = function (filepath) {
    return fs.readFileSync(filepath).toString();
};

// write content
exports.saveFile = function (path, con) {
    return new _promise2.default(function (resolve, reject) {
        fs.writeFile(path, con, function (error) {
            if (error) {
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
};

// write content
exports.saveLog = function (ContentPath, con) {
    return new _promise2.default(function (resolve, reject) {
        mkdirp(path.dirname(ContentPath), function (err) {
            if (err) {
                reject(err);
            } else {
                fs.writeFileSync(ContentPath, con);
            }
        });
    });
};

// object to json string
exports.object2String = function (obj) {
    var cache = [];
    return (0, _stringify2.default)(obj, function (key, value) {
        if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    }, 2);
};

/**
 * 创建虚拟文件，并添加关联文件
 *
 * @param {string} filePath 文件路径
 * @param {string} contents 文件内容
 * @return {VFile}
 */
exports.toVFile = function (filePath, contents) {
    var file = vfile({ path: filePath, contents: contents });
    var related = {
        style: cssFileSuffix,
        view: swanFileSuffix,
        js: jsFileSuffix,
        config: configFileSuffix
    };
    var cwd = file.cwd,
        dirname = file.dirname,
        stem = file.stem,
        extname = file.extname;

    file.data.relatedFiles = (0, _keys2.default)(related).reduce(function (prev, type) {
        var ext = '.' + related[type];
        if (ext !== extname) {
            var _filePath = path.resolve(cwd, dirname, stem + ext);
            fs.existsSync(_filePath) && (prev[type] = _filePath);
        }
        return prev;
    }, {});
    return file;
};

/**
 * 判断是否对象
 *
 * @param {Object} val 参数
 * @return {boolean} 是否对象
 */
module.exports.isObject = function isObject(val) {
    return val != null && (typeof val === 'undefined' ? 'undefined' : (0, _typeof3.default)(val)) === 'object' && Array.isArray(val) === false;
};

/**
 * 无请求头的css静态资源url添加https请求头
 *
 * @param {string} content 文件内容
 * @return {string} 处理后文件内容
 */
exports.transformCssStaticUrl = function transformCssStaticUrl(content) {
    content = content.replace(/url\((.*)\)/g, function ($1, $2) {
        if (!$2) {
            return $1;
        }
        var res = $2.replace(/^(['"\s^]?)(\/\/.*)/, function ($1, $2, $3) {
            var resUrl = $2 + 'https:' + $3;
            return resUrl;
        });
        return 'url(' + res + ')';
    });
    return content;
};

/**
 * 创建.wx2swaninfo文件
 *
 * @param {string} toPath 生成文件路径
 * @return {Promise}
 */
exports.createWx2swaninfo = function (toPath) {
    var dirPath = toPath;
    if (!isDirectory(toPath)) {
        dirPath = path.dirname(toPath);
    }
    var pkg = require('../../package.json');
    var filePath = dirPath + '/.wx2swaninfo';
    var con = '{\n    "toolName": "wx2swan",\n    "toolCliVersion": "' + pkg.version + '",\n    "createTime": ' + new Date().getTime() + '\n}';
    return new _promise2.default(function (resolve, reject) {
        fs.writeFile(filePath, con, function (error) {
            if (error) {
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
};