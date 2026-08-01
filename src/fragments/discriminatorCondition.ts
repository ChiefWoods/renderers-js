import {
    type ConstantDiscriminatorNode,
    type DiscriminatorNode,
    type FieldDiscriminatorNode,
    isNode,
    type ProgramNode,
    type SizeDiscriminatorNode,
    type StructTypeNode,
} from '@codama/nodes';
import { mapFragmentContent } from '@codama/renderers-core';
import { pipe, visit } from '@codama/visitors-core';

import { Fragment, fragment, mergeFragments, RenderScope, use } from '../utils';

/**
 * ```
 * if (data.length === 72) {
 *   return splTokenAccounts.TOKEN;
 * }
 *
 * if (containsBytes(data, getU32Encoder().encode(MY_ACCOUNT_DISCRIMINATOR), offset)) {
 *   return splTokenAccounts.TOKEN;
 * }
 *
 * if (containsBytes(data, MY_ACCOUNT_DISCRIMINATOR, offset)) {
 *   return splTokenAccounts.TOKEN;
 * }
 * ```
 */
export function getDiscriminatorConditionFragment(
    scope: Pick<RenderScope, 'nameApi' | 'typeManifestVisitor'> & {
        dataName: string;
        discriminators: DiscriminatorNode[];
        getDiscriminatorValue: (discriminator: ConstantDiscriminatorNode | FieldDiscriminatorNode) => Fragment;
        ifTrue: string;
        programNode: ProgramNode;
        struct: StructTypeNode;
    },
): Fragment {
    return pipe(
        mergeFragments(
            scope.discriminators.flatMap(discriminator => {
                if (isNode(discriminator, 'sizeDiscriminatorNode')) {
                    return [getSizeConditionFragment(discriminator, scope)];
                }
                if (isNode(discriminator, 'constantDiscriminatorNode')) {
                    return [getByteConditionFragment(discriminator, scope)];
                }
                if (isNode(discriminator, 'fieldDiscriminatorNode')) {
                    return [getFieldConditionFragment(discriminator, scope)];
                }
                return [];
            }),
            c => c.join(' && '),
        ),
        f => mapFragmentContent(f, c => `if (${c}) { ${scope.ifTrue} }`),
    );
}

function getSizeConditionFragment(
    discriminator: SizeDiscriminatorNode,
    scope: Pick<RenderScope, 'typeManifestVisitor'> & {
        dataName: string;
    },
): Fragment {
    const { dataName } = scope;
    return fragment`${dataName}.length === ${discriminator.size}`;
}

function getByteConditionFragment(
    discriminator: ConstantDiscriminatorNode,
    scope: Pick<RenderScope, 'typeManifestVisitor'> & {
        dataName: string;
        getDiscriminatorValue: (discriminator: ConstantDiscriminatorNode | FieldDiscriminatorNode) => Fragment;
    },
): Fragment {
    const { dataName } = scope;
    const constant = scope.getDiscriminatorValue(discriminator);
    return fragment`${use('containsBytes', 'solanaCodecsCore')}(${dataName}, ${constant}, ${discriminator.offset})`;
}

function getFieldConditionFragment(
    discriminator: FieldDiscriminatorNode,
    scope: Pick<RenderScope, 'typeManifestVisitor'> & {
        dataName: string;
        getDiscriminatorValue: (discriminator: ConstantDiscriminatorNode | FieldDiscriminatorNode) => Fragment;
        struct: StructTypeNode;
    },
): Fragment {
    const field = (scope.struct.fields ?? []).find(f => f.name === discriminator.name);
    if (!field || !field.defaultValue) {
        throw new Error(
            `Field discriminator "${discriminator.name}" does not have a matching argument with default value.`,
        );
    }

    const typeManifest = visit(field.type, scope.typeManifestVisitor);
    return fragment`${use('containsBytes', 'solanaCodecsCore')}(${scope.dataName}, ${typeManifest.encoder}.encode(${scope.getDiscriminatorValue(discriminator)}), ${discriminator.offset})`;
}
