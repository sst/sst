import { useInfiniteQuery, useMutation, useQueryClient } from "react-query";
import { useClient } from "./client";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Toast } from "~/components";

export function useBucketQueryInf(bucket: string, prefix: string) {
  const s3 = useClient(S3Client);

  const {
    data,
    hasNextPage,
    refetch,
    fetchNextPage,
    isFetching,
    isError,
    isFetchingNextPage,
    isLoading,
    status,
  } = useInfiniteQuery<ListObjectsV2CommandOutput>({
    queryKey: ["bucket", bucket, prefix],
    enabled: false,
    queryFn: async (q) => {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          Delimiter: "/",
          MaxKeys: 20,
          ContinuationToken: q.pageParam,
        })
      );

      if (response.Contents) {
        for (const obj of response.Contents!) {
          obj.url = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: bucket,
              Key: obj.Key,
            })
          );
        }
      }

      return response;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.IsTruncated) return undefined;
      return lastPage.NextContinuationToken;
    },
    keepPreviousData: true,
  });
  return {
    data,
    hasNextPage,
    fetchNextPage,
    refetch,
    isFetching,
    isError,
    isFetchingNextPage,
    isLoading,
    status,
  };
}

export function useUploadFile() {
  const s3 = useClient(S3Client);
  const toast = Toast.use();

  return useMutation({
    onError: () =>
      toast.create({
        type: "danger",
        text: "Failed to upload file",
      }),
    onSuccess: () =>
      toast.create({
        type: "success",
        text: "Successfully uploaded file",
      }),

    mutationFn: async (opts: {
      bucket: string;
      key: string;
      payload?: any;
    }) => {
      await s3.send(
        new PutObjectCommand({
          Bucket: opts.bucket,
          Key: opts.key,
          Body: opts?.payload,
        })
      );
    },
  });
}

export function useDeleteFile() {
  const s3 = useClient(S3Client);
  const toast = Toast.use();

  return useMutation({
    onError: () =>
      toast.create({
        type: "danger",
        text: "Failed to delete file",
      }),
    onSuccess: () =>
      toast.create({
        type: "success",
        text: "Successfully deleted file",
      }),

    mutationFn: async (opts: { bucket: string; key: string }) => {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: opts.bucket,
          Key: opts.key,
        })
      );
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
