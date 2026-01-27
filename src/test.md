---

Boas práticas em JavaScript
Incluindo seu uso com React e com TypeScript.
A linguagem JavaScript nasceu junto com os browsers, para possibiltar que os browsers fossem mais inteligentes do que simplesmente interpretar HTML e CSS.
Seu crescimento inicialmente se deu um pouco desorganizado, ela era - e ainda é - generalista demais. Uma mesma operação pode ser feita de muitas e muitas maneiras, o que pode causar uma bagunça no código, cada desenvolvedor usa suas preferências. No final, é sempre difícil entrar em um projeto novo se ele foi feito de um jeito que você não está habituado.
Daí surgiu a necessidade de se criar regras de boas práticas, que servem para padronizar a maneira de se escrever código JavaScript, tendo como focos principais a performa e código limpo. 
Mas, é claro, estas regras não são leis, você pode programar JavaScript do modo que quiser, mas é um bom conselho seguir o maior número possível destas regras, como todo mundo faz.
Segue então sujestões de boas práticas em JavaScript, adotadas largamente pela comunidade JavaScript ao redor do mundo, baseado em varias publicacoes  a respeito.

---

Ponto e vírgula terminando o comando.
JavaScript permite que você suprima o ponto e vírgula ao final de cada linha de comando. Alguns acham que o código fica mais "limpo".
Mas essa prática não vem sem um custo. 
Não é verdade que colocar ou não o ponto e virgula é indiferente.
O interpretador JavaScript precisa do ponto e virgula para saber que um comando terminou, e um novo começará. Se você não coloca o ponto e vírgula, o interpretador JavaScript tenta entender o que você escreveu, e ele supões que naquela posição deve ter um ponto e virgula.
Mas essa suposição não é 100% garantia de acerto. Há uma margem bem pequena para erro, na grande maioria das vezes não acontece nenhum erro. Mas pode bugar seu código.
Mas como assim, erro? 
Veja este trecho de código, e deduza qual o resultado final. Se você rodar o programa, verá que você errou. Ou melhor, o interpretador JavaScript errou ao deduzir onde deveria ter um ponto e vírgula.

```JavaScript
// este código não funciona

const jane = {}
const ender = {}
[jane, ender].forEach((person) => person.father = 'orson')

console.log(jane.father);  
```
```JavaScript
// este código funciona

const jane = {};
const ender = {};
[jane, ender].forEach((person) => person.father = 'orson');

console.log(jane.father);
```
Assim, use ponto e vírgula ao final de cada comando JavaScript.
Switch, if/else, dicionário
Em programação moderna JavaScript, deve-se usar a técnica de dicionário para substituir o switch. E se um conjunto if/else estiver sendo usado como um switch, este também deve ser substituido. 
Com isso teremos uma melhor performa e um código mais limpo, sem as limitações do switch.
Os 3 códigos a seguir produzem o mesmo resultado. O último, baseado em dicionário, deve ser o preferido. 
// switch

let b;
switch(a) {
    case "Hello":
      b = 345;
      break;
    case "xyz":
      b = 18;
      break;
    case "abcdef":
      b = 1956;
      break;
    case "world":
      b = 15;
      break;
    default:
      b = -1000;
}

console.log(b)
// if/else

let b;
if (a === "Hello") {
    b = 345;
} else if (a === "xyz") {
    b = 18;
} else if (a === "abcdef") {
    b = 1956;
} else if (a === "world") {
    b = 15;
} else {
    b = -1000;
}

console.log(b)
// dicionário

const b = {
    Hello: 345,
    xyz: 18,
    abcdef: 1956,
    world: 15,
}[a] || -1000;

console.log(b)
Aspas simples, aspas duplas, aspas invertidas.
Em JavaScript, basicamente pode-se definir o conteúdo de uma string de três formas:
let x = 'Oh, my god!';
ley y = "Hello word";
let z = `Star Trek`;
Especificamente no caso do React, faça assim:
use aspas simples para definir uma string simples, como no primeiro examplo acima.
use aspas invertidas para uma string composta com variáveis, por exemplo:

let a = `My name is ${userName}`;
também use aspas invertidas para concatenação de strings:

const a = 'My name is ' + userName;      // ruim 
const b = `My name is ${userName}`;  // bom
use aspas duplas para parâmetros de tags HTML e de componentes React, e também para conteúdo JSON.

<div id="myId">
    <Form name="userDataForm">
    ...
    </Form>
</div> 
Convenção para nomes de variáveis, funções e tipos.
Estas regras se aplicam especificamente para o React.
camelCase: use para dar nome a variáveis e funções, exceto:
- constantes primitivos (string, number, boolean, etc.).
- objects garantidamente constantes.

let userName = 'Jane';        // bom
const userName = 'Jane';          // ruim
const who = userName;         // bom
let UserName = 'Jane';            // ruim
let user_name = 'Jane';           // ruim
function addNumbers (a, b)    // bom
function AddNumbers (a, b)        // ruim
UPPER_CASE: para primitivos constantes e objetos garantidamente constantes.

const USER_NAME = 'Jane';                     // bom
const USER_NAME = `${firstName} ${lastName}`;     // ruim
const userName = 'Jane'.                          // ruim
const USER_INFOS = {                          // bom, se os valores internos
  firstName: "Jane",                          // nunca mudarão durante a 
  lastName: "Valentine",                      // a execução da app.
  id: 4433,                                   // Note que as variáveis dentro 
}                                             // do objeto ficam em camelCase. 
PascalCase: use para dar nome a componentes React, classes e tipos TypeScript. E não inicie o nome de uma interface com o identificador I - React não é Angular.

const MyComponent = () => {     // bom
const myComponent = () => {         // ruim
const My_Component = () => {        // ruim
class Packers {                 // bom 
class packers {                     // ruim
interface MyComponentProps {    // bom
interface IMyComponentProps {       // ruim (tem o identificador I)
snack_case: não se usa snack_case no React.
Porém, há situações onde surjem variáveis snack_case em um programa React, como por exemplo o conteúdo de um JSON recebido de uma API.
Nestes casos, é boa prática que a API não contenha snack_case pra servir um Frontend React. Caso não seja possível tal mudança, é interessante criar uma variável camelCase para substituir a snack_case dentro do React. 
Não processe uma variável snack_case diretamente dentro do programa.

Encadeamento if/else
Deve-se evitar ao máximo o encadeamento de if/else, algo que torna o código mais difícil de ser lido. Evite também o uso de variáveis intermediárias.
Exemplo:
funcion myFunction(a, b) {
  let result;

  if (a > 0) {
    if (b > 0) {
      result = a / b;
    } else if (b < 0) {
      result = a * b;
    } else {
      result = a;
    }
  } else {
    result = b;
  }     

  return result;
}
Seria melhor escrito:
funcion myFunction(a, b) {
  if (a <= 0) {
    return b;
  }

  if (b > 0) {
    return a / b;
  }

  if (b < 0) {
    return a * b;
  }

  return a
}

Procure sempre avaliar se seu código com vários níveis de if/else (encadeamento) pode ser refatorado para diminuir a complexidade.
Ternários
Ternários não devem ser aninhados e, preferencialmente, devem ser expressões de uma única linha.
// ruim
const foo = maybe1 > maybe2
  ? "bar"
  : value1 > value2
    ? "baz"
    : null;
// bom
const maybeNull = value1 > value2 ? 'baz' : null;
const foo = maybe1 > maybe2
  ? "bar"
  : maybeNull;
// melhor
const maybeNull = value1 > value2 ? 'baz' : null;
const foo = maybe1 > maybe2 ? "bar" : maybeNull;
Comentários
Use /** ... */ para comentários multi-linhas.
// ruim

// make() returns a new element
// based on the passed in tag name
//
// @param {String} tag
// @return {Element} element
function make(tag) {

  // ...

  return element;
}
// bom

/**
 * make() returns a new element
 * based on the passed-in tag name
 */
function make(tag) {

  // ...

  return element;
}
Use // para comentários de uma única linha. Coloque comentários de uma única linha em uma nova linha acima do assunto do comentário. Deixe uma linha em branco antes do comentário, a menos que ele esteja na primeira linha de um bloco.
// ruim
const active = true;  // is current tab

// bom
// is current tab
const active = true;

// ruim
function getType() {
  console.log('fetching type...');
  // set the default type to 'no type'
  const type = this.type || 'no type';

  return type;
}

// bom
function getType() {
  console.log('fetching type...');

  // set the default type to 'no type'
  const type = this.type || 'no type';

  return type;
}

// bom
function getType() {
  // set the default type to 'no type'
  const type = this.type || 'no type';

  return type;
}
Prefixar seus comentários com FIXME ou TODO ajuda outros desenvolvedores a entender rapidamente se você está apontando um problema que precisa ser revisado, ou se está sugerindo uma solução para o problema que precisa ser implementada. Esses comentários são diferentes dos comentários comuns porque são acionáveis. As ações são: FIXME: - precisa resolver isso, ou TODO: - precisa implementar.
class Calculator extends Abacus {
  constructor() {
    super();

    // FIXME: shouldn't use a global here
    total = 0;

    // TODO: age should be configurable by an options param
    this.age = 10;
  }
}
Whitespace
Use tabulação suave (caractere de espaço) configurada para 2 espaços.
// ruim
function foo() {
∙∙∙∙let name; // 4 spaces
}

// ruim
function bar() {
∙let name; // 1 space
}

// bom
function baz() {
∙∙let name; // 2 spaces
}
Coloque 1 espaço antes da abertura de uma chave.
// ruim
function test(){
  console.log('test');
}

// bom
function test() {
  console.log('test');
}

// ruim
dog.set('attr',{
  age: '1 year',
  breed: 'Bernese Mountain Dog',
});

// bom
dog.set('attr', {
  age: '1 year',
  breed: 'Bernese Mountain Dog',
});
Coloque 1 espaço antes da abertura de parêntese em estruturas de controle (if, while, etc.). Não coloque espaço entre a lista de argumentos e o nome da função em chamadas e declarações de função.
// ruim
if(isJedi) {
  fight ();
}

// bom
if (isJedi) {
  fight();
}

// ruim
function fight () {
  console.log ('Swooosh!');
}

// bom
function fight() {
  console.log('Swooosh!');
}
Separe operadores com espaços.
// ruim
const x=y+5;

// bom
const x = y + 5;
Deixe uma linha em branco após blocos e antes da próxima instrução.
// ruim
if (foo) {
  return bar;
}
return baz;

// bom
if (foo) {
  return bar;
}

return baz;
Não espace internamente os blocos com linhas em branco.
// ruim
function bar() {

  console.log(foo);

}

// ruim
if (baz) {

  console.log(quux);
} else {
  console.log(foo);

}

// ruim
class Foo {

  constructor(bar) {
    this.bar = bar;
  }
}

// bom
function bar() {
  console.log(foo);
}

// bom
if (baz) {
  console.log(quux);
} else {
  console.log(foo);
}
Não use múltiplas linhas em branco para separar seu código.
// ruim
class Person {
  constructor(fullName, email, birthday) {
    this.fullName = fullName;

    this.email = email;

    this.setAge(birthday);
  }
}

// bom
class Person {
  constructor(fullName, email, birthday) {
    this.fullName = fullName;
    this.email = email;
    this.setAge(birthday);
  }
}
Path Absoluto
Em React, evite usar path relativo sempre que possivel. O path absoluto é especialmente útil quando o path em questão é baseado em src/
Com path absoluto o código fica mais limpo, facilitando sua interpretação.
Exemplos:
// relative path
import React from 'react';
import Dialog from '../../../../Dialog;    // path relativo
import styles from './MyCar.module.scss';  // path relativo
// absolute path
import React from 'react';
import Dialog from 'components/Dialog;    // path absoluto
import styles from './MyCar.module.scss'; // aqui mantem-se path relativo
Note bem: mesmo com o recurso de path absoluto ativado, pode-se continuar usando o path relativo onde se quiser; o uso de path absoluto não é obrigatório. Isto é importante num processo de migração para path absoluto.
Para poder usar path absoluto no projeto, configure o arquivo tsconfig.json (ou jsconfig.json se não estiver usando TypeScript):
{
  "compilerOptions": {
    ...
    "baseUrl": "src",
    "paths": {
      ...
      "src/*": ["src/*"]
    }
    "include": ["src"],
  }
}
Cópia de objetos

❌ Atribuição direta
A atribuição direta não funciona no caso de objetos. A atribuição neste caso não faz uma cópia, mas sim uma referência (ponteiro) para o objeto original.
Em outras palavras, quando você faz uma atribuição objB = objA, objB não é uma cópia do objA, mas sim o próprio objA agora com um segundo nome objB.
Se você alterar alguma coisa dentro do objB, a alteração aparecerá também em objA.
const objA = {
  name: 'Jane'
};

const objB = objA;
objB.name = 'Ender';

console.log(objA.name); // resultado: 'Ender'
❌  JSON.stringfy() e JSON.parse()
O código a seguir faz uma cópia de objeto:
const objA = {
  name: 'Jane'
};

const objB = JSON.parse(JSON.sringify(objA));
No entanto, é uma técnica com um processamento muito pesado e lento, totalmente fora dos padrões de boas práticas.
Nunca, jamais, use este recurso para cópia de objetos.
❌ Loadash
NÃO use loadash no React.
⚠️ Operador spread.
Este é uma tecnica muito eficiente, amplamente usada no React, e funciona perfeitamente, mas é preciso se atentar para fato de que a cópia será feita apenas no primeiro nível do objeto; do segundo nível em diante é feita uma referência (ponteiro) para a variável original.
const objA = {
  name: 'Jane',
  address: {
    street: 'Avenida Brasil',
    number: '13b',
    zip: '05145-000'
  }
};

const objB = { ...objA };

/**
 *   objB.name é uma cópia de objA.name.       <- primeiro nível      
 *   objB.address é uma cópia de objA.address  <- primeiro nível
 *
 *   objB.address.street NÃO é uma copia de ObjA.address.street <- segundo nível
 */

objB.name = 'Ender';
console.log(objB.name); // Ender
console.log(objA.name); // Jane

objB.address.number = '666';
console.log(objB.address.number); // 666
console.log(objB.address.number); // 666
É preciso ter isso em mente ao se usar o spreed para cópia de objeto.
O mesmo vale para array.
✅ Cópia recursiva
Quando não for possível usar spread devido às limitações citadas, a solução definitiva é criar uma função que faça uma cópia recursiva, que garante que de fato teremos uma cópia em todos os níveis.
Eis um exemplo:
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => optimizedClone(item));
  if (obj instanceof RegExp) return new RegExp(obj);
  
  const clone = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}
* Note bem: a função deepClone() acima não serve para referências cruzadas.