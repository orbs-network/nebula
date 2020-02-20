"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = __importDefault(require("chai"));
const chai_asserttype_1 = __importDefault(require("chai-asserttype"));
chai_1.default.use(chai_asserttype_1.default);
const { expect } = chai_1.default;
const resolve_path_1 = require("../../lib/utils/resolve-path");
mocha_1.describe('path', () => {
    mocha_1.it('should keep absolute path', () => {
        expect(resolve_path_1.resolvePath("/tmp/hello", __dirname)).to.equal("/tmp/hello");
    });
    mocha_1.it('should expand relative path', () => {
        expect(resolve_path_1.resolvePath("../hello", __dirname)).to.equal(process.cwd() + "/test/hello");
    });
    mocha_1.it('should expand path relative to home', () => {
        expect(resolve_path_1.resolvePath("~/hello", __dirname)).to.equal(process.env.HOME + "/hello");
    });
});
//# sourceMappingURL=path-tests.js.map