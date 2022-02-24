import { unmarshall } from "@aws-sdk/util-dynamodb";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { pick } from "remeda";
import { Button, SidePanel, Spacer, Toast } from "~/components";
import { useDeleteItem, useGetItem, usePutItem } from "~/data/aws/dynamodb";
import { styled } from "~/stitches.config";

type EditorProps = ReturnType<typeof useEditor>["props"];

const TextArea = styled("textarea", {
  padding: "$lg",
  border: "1px solid $border",
  fontSize: "$sm",
  background: "$accent",
  color: "$hiContrast",
  lineHeight: 1.5,
  borderRadius: 6,
  width: "100%",
  resize: "none",
  fontFamily: "$sans",
  "&:focus": {
    outline: "none",
  },
});

export function Editor(props: EditorProps) {
  const form = useForm<{ item: string }>();
  const toasts = Toast.use();
  const putItem = usePutItem();
  const deleteItem = useDeleteItem();
  const getItem = useGetItem(props.table, props.keys);
  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const parsed = JSON.parse(data.item);
      if (editing) {
        const nextKeys = pick(parsed, Object.keys(props.keys));
        if (JSON.stringify(nextKeys) !== JSON.stringify(props.keys))
          throw new Error("Cannot edit keys");
      }
      await putItem.mutateAsync({
        item: parsed,
        tableName: props.table,
        original: props.original,
      });
      props.onClose();
    } catch (ex: any) {
      toasts.create({
        type: "danger",
        text: ex.message,
      });
    }
  });
  const editing = Boolean(props.keys);
  useEffect(() => {
    if (!props.show) return;
    if (!getItem.data) return;
    const unmarshalled = unmarshall(getItem.data.Item);
    form.reset({
      item: JSON.stringify(unmarshalled, null, 2),
    });
  }, [getItem.data]);
  if (!props.show) return null;
  return (
    <SidePanel.Root>
      <SidePanel.Header>
        {editing ? "Edit" : "Create Item"}
        <SidePanel.Close onClick={props.onClose} />
      </SidePanel.Header>
      {getItem.isSuccess && (
        <SidePanel.Content>
          <form onSubmit={onSubmit}>
            <TextArea {...form.register("item")} rows={15} />
            <Spacer vertical="lg" />
            <SidePanel.Toolbar>
              {editing && (
                <Button
                  color="danger"
                  onClick={async () => {
                    await deleteItem.mutateAsync({
                      keys: props.keys,
                      tableName: props.table,
                      original: props.original,
                    });
                    props.onClose();
                  }}
                  type="button"
                >
                  Delete
                </Button>
              )}
              <Button type="submit">Save</Button>
            </SidePanel.Toolbar>
          </form>
        </SidePanel.Content>
      )}
    </SidePanel.Root>
  );
}

export function useEditor(table: string) {
  const [original, setOriginal] = useState<any>();
  const [keys, setKeys] = useState<Record<string, string>>();
  const [show, setShow] = useState(false);
  return {
    props: { original, table, keys, show, onClose: () => setShow(false) },
    create() {
      setShow(true);
      setOriginal(undefined);
      setKeys(undefined);
    },
    edit(item: any, keys: Record<string, string>) {
      setOriginal(item);
      setKeys(keys);
      setShow(true);
    },
  };
}
