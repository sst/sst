import { dataToItem, itemToData } from "dynamo-converters";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button, Spinner, Toast } from "~/components";
import { deleteItem, ScanItem, updateItem } from "~/data/aws/dynamodb";
import { styled } from "~/stitches.config";
import TextareaAutosize from "react-textarea-autosize";
import { diff } from "deep-object-diff";
import { useQueryClient } from "react-query";

const InvokeRoot = styled("div", {
  background: "$accent",
  paddingBottom: "$md",
});

const InvokeToolbar = styled("div", {
  padding: "0 $lg",
  display: "flex",
  color: "$gray10",
  fontSize: "$sm",
  alignItems: "center",
  height: 36,
  justifyContent: "space-between",
});

const InvokeTextarea = styled(TextareaAutosize, {
  padding: "$md $lg",
  border: "0",
  fontSize: "$sm",
  background: "transparent",
  color: "$hiContrast",
  lineHeight: 1.5,
  borderRadius: 4,
  width: "100%",
  resize: "none",
  "&:focus": {
    outline: "none",
  },
});

const Status = styled("div", {
  padding: "$md",
  fontSize: "$sm",
  variants: {
    success: {
      true: {
        color: "$green10",
      },
    },
    error: {
      true: {
        color: "$red10",
      },
    },
  },
});

type Params = {
  stack?: string;
  table?: string;
  index?: string;
  mode?: string;
  "*"?: string;
};

export function Update(props: {
  params: Params;
  initialData?: any;
  setSelectedRow: any;
  current: number;
  Pk: string;
  Sk: string;
}) {
  const update = updateItem();
  const remove = deleteItem();
  const queryClient = useQueryClient();
  const { params, initialData, setSelectedRow, current, Pk, Sk } = props;

  const cacheData = queryClient.getQueryData<ScanItem>([
    "scanTable",
    params.table,
    current,
    params.index,
  ]);

  const form = useForm<{ json: string }>();

  useEffect(() => {
    update.reset();
    form.setValue("json", JSON.stringify(initialData, null, 2));
    form.setFocus("json");
  }, [initialData]);

  const toast = Toast.use();
  const onSubmit = form.handleSubmit(async (data) => {
    try {
      console.log(data.json);
      const parsed = !data.json ? {} : JSON.parse(data.json);

      const delta = diff(initialData, parsed);
      if (Object.keys(delta).includes(Pk) || Object.keys(delta).includes(Sk)) {
        alert("You can't update the partition or sort key");
      } else {
        await update.mutateAsync({
          tableName: params.table,
          delta,
          item: {
            [Pk]: initialData[Pk],
            [Sk]: initialData[Sk],
          },
        });
        setSelectedRow({});

        let currentIndex = -1;

        if (cacheData.Items) {
          for (let i = 0; i < cacheData.Items.length; i++) {
            if (
              Object.keys(diff(cacheData.Items[i], dataToItem(initialData)))
                .length === 0
            ) {
              currentIndex = i;
              break;
            }
          }
        }

        cacheData.Items[currentIndex] = dataToItem(parsed);

        queryClient.setQueryData(
          ["scanTable", params.table, current, params.index],
          cacheData
        );

        toast.create({
          type: "success",
          text: "Item updated",
        });
      }
    } catch {
      toast.create({
        type: "danger",
        text: "Invalid JSON payload",
      });
    }
  });

  const onDelete = async () => {
    remove.reset();
    await remove.mutateAsync({
      tableName: params.table,
      item: {
        [Pk]: initialData[Pk],
        [Sk]: initialData[Sk],
      },
    });
    setSelectedRow({});

    let currentIndex = -1;

    if (cacheData.Items) {
      for (let i = 0; i < cacheData.Items.length; i++) {
        if (
          Object.keys(diff(cacheData.Items[i], dataToItem(initialData)))
            .length === 0
        ) {
          currentIndex = i;
          break;
        }
      }
    }

    delete cacheData.Items[currentIndex];

    queryClient.setQueryData(
      ["scanTable", params.table, current, params.index],
      cacheData
    );

    toast.create({
      type: "success",
      text: "Item deleted",
    });
  };

  return (
    <>
      <InvokeRoot>
        <form onSubmit={onSubmit}>
          <InvokeTextarea maxRows={20} minRows={5} {...form.register("json")} />
          <InvokeToolbar>
            <Button
              type="submit"
              style={{ width: 100 }}
              color="info"
              disabled={update.isLoading}
            >
              {update.isLoading ? (
                <Spinner size="sm" color="accent" />
              ) : (
                "Update"
              )}
            </Button>
            <Button
              onClick={onDelete}
              style={{ width: 100 }}
              color="danger"
              disabled={remove.isLoading}
            >
              {remove.isLoading ? (
                <Spinner size="sm" color="accent" />
              ) : (
                "Delete"
              )}
            </Button>
          </InvokeToolbar>
        </form>
      </InvokeRoot>
      {update.isSuccess && <Status success>Update success</Status>}
      {update.isError && (
        <Status error>Error: {update.error.message}</Status>
      )}{" "}
    </>
  );
}
