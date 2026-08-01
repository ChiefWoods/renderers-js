import type { TypeNode } from '@codama/nodes';

import { Fragment, mergeFragments, RenderScope, TypeManifest, typeManifest } from '../utils';
import { getTypeFragment } from './type';
import { getTypeCodecFragment } from './typeCodec';

export function getTypeWithCodecFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        codecDocs?: string[];
        decoderDocs?: string[];
        encoderDocs?: string[];
        manifest: TypeManifest;
        name: string;
        node: TypeNode;
        size: number | null;
        typeDocs?: string[];
        typeManifest?: Pick<TypeManifest, 'isEnum' | 'looseType' | 'strictType'>;
    },
): Fragment {
    return mergeFragments(
        [
            getTypeFragment({
                ...scope,
                docs: scope.typeDocs,
                manifest: typeManifest({ ...scope.manifest, ...scope.typeManifest }),
            }),
            getTypeCodecFragment(scope),
        ],
        renders => renders.join('\n\n'),
    );
}
