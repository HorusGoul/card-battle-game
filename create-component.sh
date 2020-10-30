#!/bin/bash
#./create-component.sh {parameter1} {parameter2}
# Parameter 1: Component name in PascalCase
# Paremeter 2 (Optional): Parent component folder 

function toKebabCase {
  echo $1 | sed -e 's/\([A-Z]\)/-\1/g' -e 'y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/' -e 's/^-//'
}

function toCamelCase {
  WORD=$1
  echo $(echo ${WORD:0:1} | tr "[A-Z]" "[a-z]")${WORD:1}
}

COMPONENT_NAME=$1
PARENT_COMPONENT_DIR=$2
COMPONENT_NAME_CAMELCASE=$(toCamelCase $COMPONENT_NAME)
COMPONENT_NAME_KEBABCASE=$(toKebabCase $COMPONENT_NAME)

cd ./src/components/$PARENT_COMPONENT_DIR
mkdir $COMPONENT_NAME_KEBABCASE
cd $COMPONENT_NAME_KEBABCASE

touch $COMPONENT_NAME.tsx $COMPONENT_NAME.module.scss index.ts

COMPONENT_TEMPLATE="import React from 'react';
import styles from './$COMPONENT_NAME.module.scss';

function $COMPONENT_NAME() {
  return (
    <div className={styles.$COMPONENT_NAME_CAMELCASE}>$COMPONENT_NAME</div>
  );
}

export default $COMPONENT_NAME;
"

SCSS_MODULE_TEMPLATE=".$COMPONENT_NAME_CAMELCASE {
  display: block;
}
"

INDEX_TEMPLATE="export { default } from './$COMPONENT_NAME';
export * from './$COMPONENT_NAME';
"

echo "$COMPONENT_TEMPLATE" > $COMPONENT_NAME.tsx
echo "$SCSS_MODULE_TEMPLATE" > $COMPONENT_NAME.module.scss
echo "$INDEX_TEMPLATE" > index.ts

cd ../../../../