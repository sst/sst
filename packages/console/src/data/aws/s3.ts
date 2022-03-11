import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";
import { useClient } from "./client";
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Toast } from "~/components";

export function useBucketList(bucket: string, prefix: string) {
  const s3 = useClient(S3Client);
  return useInfiniteQuery<ListObjectsV2CommandOutput>({
    refetchOnWindowFocus: false,
    queryKey: ["bucket", bucket, prefix],
    queryFn: async (q) => {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          Delimiter: "/",
          MaxKeys: 100,
          ContinuationToken: q.pageParam,
        })
      );
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.IsTruncated) return undefined;
      return lastPage.NextContinuationToken;
    },
  });
}
export function useBucketListPrefetch() {
  const s3 = useClient(S3Client);
  const client = useQueryClient();
  return (bucket: string, prefix: string) =>
    // TODO: Centralize this
    client.prefetchInfiniteQuery<ListObjectsV2CommandOutput>({
      queryKey: ["bucket", bucket, prefix],
      queryFn: async (q) => {
        const response = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            Delimiter: "/",
            MaxKeys: 100,
            ContinuationToken: q.pageParam,
          })
        );
        return response;
      },
      staleTime: 1000 * 30,
    });
}

type SignedUrlOpts = {
  bucket?: string;
  key?: string;
  etag?: string;
};

export function useBucketObject(opts: SignedUrlOpts) {
  const s3 = useClient(S3Client);
  return useQuery({
    enabled: Boolean(opts.bucket && opts.key && opts.etag),
    queryKey: ["signedUrl", opts.bucket, opts.key, opts.etag],
    queryFn: async () => {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: opts.bucket!,
          Key: opts.key!,
        })
      );

      const info = await s3.send(
        new HeadObjectCommand({
          Bucket: opts.bucket!,
          Key: opts.key!,
          IfModifiedSince: new Date(0),
        })
      );

      return {
        key: opts.key!,
        info,
        url,
      };
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useBucketFile(opts: SignedUrlOpts) {
  const s3 = useClient(S3Client);
  return useQuery({
    enabled: Boolean(opts.bucket && opts.key && opts.etag),
    queryKey: ["signedUrl", opts.bucket, opts.key, opts.etag],
    queryFn: async () => {
      return await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: opts.bucket!,
          Key: opts.key!,
        })
      );
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useUploadFile() {
  const s3 = useClient(S3Client);
  const qc = useQueryClient();
  const toast = Toast.use();

  return useMutation({
    onError: () =>
      toast.create({
        type: "danger",
        text: "Failed to upload file",
      }),

    mutationFn: async (opts: {
      bucket: string;
      key: string;
      prefix: string;
      payload?: any;
      prefetch?: ReturnType<typeof useBucketListPrefetch>;
      contentType?: string;
      visible: number[];
    }) => {
      await s3.send(
        new PutObjectCommand({
          Bucket: opts.bucket,
          Key: opts.key,
          Body: opts.payload,
          ContentType: opts.contentType,
        })
      );
      await qc.invalidateQueries({
        queryKey: ["bucket", opts.bucket, opts.prefix],
        refetchPage: (_, index) => opts.visible.includes(index),
      });
      qc.invalidateQueries({
        queryKey: ["bucket", opts.bucket, opts.prefix],
        refetchPage: (_, index) => !opts.visible.includes(index),
      });
      if (opts.prefetch) await opts.prefetch(opts.bucket, opts.key);
    },
  });
}

export function useDeleteFile() {
  const s3 = useClient(S3Client);
  const qc = useQueryClient();
  const toast = Toast.use();

  return useMutation({
    onError: () =>
      toast.create({
        type: "danger",
        text: "Failed to delete file",
      }),

    mutationFn: async (opts: {
      bucket: string;
      key: string;
      prefix: string;
      visible: number[];
    }) => {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: opts.bucket,
          Key: opts.key,
        })
      );
      await qc.invalidateQueries({
        queryKey: ["bucket", opts.bucket, opts.prefix],
        refetchPage: (_, index) => opts.visible.includes(index),
      });
      qc.invalidateQueries({
        queryKey: ["bucket", opts.bucket, opts.prefix],
        refetchPage: (_, index) => !opts.visible.includes(index),
      });
    },
  });
}

export function useRenameFile() {
  const s3 = useClient(S3Client);
  const toast = Toast.use();

  return useMutation({
    onError: () =>
      toast.create({
        type: "danger",
        text: "Failed to rename file",
      }),
    onSuccess: () =>
      toast.create({
        type: "success",
        text: "Successfully renamed file",
      }),

    mutationFn: async (opts: {
      bucket: string;
      key: string;
      newKey: string;
    }) => {
      await s3.send(
        new CopyObjectCommand({
          Bucket: opts.bucket,
          Key: opts.newKey,
          CopySource: opts?.bucket + "/" + opts?.key || "",
        })
      );
      await s3.send(
        new DeleteObjectCommand({
          Bucket: opts.bucket,
          Key: opts.key,
        })
      );
    },
  });
}
