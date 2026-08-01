import { AccountNode, resolveNestedTypeNode } from '@codama/nodes';
import { getLastNodeFromPath, NodePath, visit } from '@codama/visitors-core';

import { Fragment, mergeTypeManifests, RenderScope, TypeManifest } from '../utils';
import { getTypeWithCodecFragment } from './typeWithCodec';

export function getAccountTypeFragment(
    scope: Pick<RenderScope, 'customAccountData' | 'nameApi' | 'typeManifestVisitor'> & {
        accountPath: NodePath<AccountNode>;
        size: number | null;
        typeManifest: TypeManifest;
    },
): Fragment | undefined {
    const { accountPath, typeManifest, nameApi, customAccountData } = scope;
    const accountNode = getLastNodeFromPath(accountPath);
    if (customAccountData.has(accountNode.name)) return;

    const discriminatorFields = (accountNode.discriminators ?? [])
        .filter(discriminator => discriminator.kind === 'fieldDiscriminatorNode')
        .map(discriminator => discriminator.name);
    const data = resolveNestedTypeNode(accountNode.data);
    const publicTypeManifest =
        discriminatorFields.length === 0
            ? undefined
            : mergeTypeManifests(
                  (data.fields ?? [])
                      .filter(field => !discriminatorFields.includes(field.name))
                      .map(field => visit(field, scope.typeManifestVisitor)),
                  { mergeTypes: renders => `{ ${renders.join('')} }` },
              );

    return getTypeWithCodecFragment({
        codecDocs: [`Gets the codec for {@link ${nameApi.dataType(accountNode.name)}} account data.`],
        decoderDocs: [`Gets the decoder for {@link ${nameApi.dataType(accountNode.name)}} account data.`],
        encoderDocs: [`Gets the encoder for {@link ${nameApi.dataArgsType(accountNode.name)}} account data.`],
        manifest: typeManifest,
        name: accountNode.name,
        nameApi,
        node: data,
        size: scope.size,
        typeDocs: accountNode.docs,
        typeManifest: publicTypeManifest,
    });
}
