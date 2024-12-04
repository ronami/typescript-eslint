/* eslint-disable @typescript-eslint/no-unused-vars */

declare const d: 0 | 1;

function test1({
  // '-2': b,
  // ['0']: a,
  [d]: c,
}: [
  //
  boolean,
  { a: number },
  // ...string[],
  // string,
  // boolean,
  // number,
]) {
  // ...
}

// declare const e: string;

// function test2({
//   // '-2': b,
//   // 1: a,
//   [e]: c,
// }: {
//   hello: number;
// }) {
//   // ...
// }
