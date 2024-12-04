function test({
  used,
}: {
  // Unused index signature '[number]' in destructuring.
  [i: number]: boolean;
  [i: string]: boolean;
}) {
  // ...
}
