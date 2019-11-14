const PREC = {
  ASSIGN: 0,
  OR: 2,
  AND: 3,
  PLUS: 4,
  RELATIONAL: 5,
  TIMES: 6,
  NOT: 7,
  NEG: 9,
  CALL: 10
};

module.exports = grammar({
  name: 'spade',
  extras: $ => [
    $.comment,
    /[\s\n\uFEFF\u2060\u200B]/
  ],
  word: $ => $.identifier,
  rules: {
    module: $ => repeat($._definition),

    _definition: $ => choice(
      $.function_definition
    ),

    function_definition: $ => seq(
      field('name', $.identifier),
      field('parameters', $.typedParameters),
      optional(seq(':', $.identifier)),
      $.block
    ),

    block: $ => seq('{', repeat($._statement), '}'),

    _statement: $ => choice(
      $.command,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.repeat_statement,
      $.case_statement,
      ...[
        $.assignment,
        $.call,
        $.return_statement
      ].map(x => seq(x, $._linesep))
    ),

    _expression: $ => choice(
      $.identifier,
      $.true,
      $.false,
      $.number,
      $.string,
      $.array,
      $.map,
      $.call,
      $.unary_expression,
      $.binary_expression,
      $.parenthesized_expression
    ),

    _linesep: $ => /[;\n]/,

    command: $ => seq(
      '/',
      field('command', /.+/)
    ),

    unary_expression: $ => choice(
      ...[
        ['-', PREC.NEG],
        ['!', PREC.NOT]
      ].map(([op, precedence]) => prec.left(precedence, seq(
        field('operator', op),
        field('operand', $._expression)
      )))
    ),

    binary_expression: $ => choice(
      ...[
        ['&', PREC.AND],
        ['|', PREC.OR],
        ['+', PREC.PLUS],
        ['-', PREC.PLUS],
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['==', PREC.RELATIONAL],
        ['!=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['*', PREC.TIMES],
        ['/', PREC.TIMES],
        ['%', PREC.TIMES]
      ].map(([op, precedence]) => prec.left(precedence, seq(
        field('left', $._expression),
        field('operator', op),
        field('right', $._expression)
      )))
    ),

    parenthesized_expression: $ => seq(
      '(',
      $._expression,
      ')'
    ),

    assignment: $ => seq(
      field('left', $.identifier),
      '=',
      field('right', $._expression)
    ),

    if_statement: $ => seq(
      'if',
      field('condition', $._expression),
      $.block,
      optional(repeat(seq(
        'else',
        'if',
        field('condition', $._expression),
        $.block,
      ))),
      optional(seq('else', field('else_condition', $._expression), $.block)),
    ),

    for_statement: $ => seq(
      'for',
      field('name', $.identifier),
      'in',
      field('expression', $._expression),
      $.block
    ),

    while_statement: $ => seq(
      'while',
      field('expression', $._expression),
      $.block
    ),

    repeat_statement: $ => seq(
      'repeat',
      field('expression', $._expression),
      $.block
    ),

    case_statement: $ => seq(
      'case',
      field('expression', $._expression),
      $.case_body
    ),

    case_body: $ => seq(
      '{',
      repeat($.case_entry),
      '}'
    ),

    case_entry: $ => seq(
      field('value', $._expression),
      field('block', $.block)
    ),

    return_statement: $ => seq('return', optional($._expression)),

    call: $ => prec(PREC.CALL, seq(
      field('function', $.identifier),
      field('arguments', $.arguments)
    )),

    arguments: $ => prec(PREC.CALL, seq(
      '(',
      commaSep($._expression),
      ')'
    )),

    typedParameters: $ => seq(
      '(',
      commaSep($.typedParameter),
      ')'
    ),

    typedParameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.identifier)
    ),

    array: $ => seq(
      '[',
      commaSep($._expression),
      ']'
    ),

    map: $ => seq(
      '{',
      commaSep($.pair),
      '}'
    ),

    pair: $ => seq(
      field('key', $.identifier),
      ':',
      field('value', $._expression)
    ),

    identifier: $ => /[a-zA-Z_][a-zA-Z_0-9]*/,

    true: $ => 'true',
    false: $ => 'false',
    string: $ => token(seq(
      '\'',
      repeat(choice(/[^\\'\n]/, /\\(.|\n)/)),
      '\''
    )),
    number: $ => /\d+/,

    comment: $ => token(seq('--', /.*/))
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}