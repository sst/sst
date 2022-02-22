import { dataToItem } from "dynamo-converters";
import { UseFormReturn } from "react-hook-form";
import { Button, Spinner, Toast } from "~/components";
import { createItem } from "~/data/aws/dynamodb";
import { styled } from "~/stitches.config";
import TextareaAutosize from "react-textarea-autosize";

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

export function Create(props: {
  params: Params;
  form: UseFormReturn<{ json: string }>;
}) {
  const insert = createItem();

  const { form } = props;
  const toast = Toast.use();
  const onSubmit = form.handleSubmit((data) => {
    try {
      const parsed = !data.json ? {} : JSON.parse(data.json);
      insert.mutate({
        tableName: props.params.table,
        item: dataToItem(parsed),
      });
    } catch {
      toast.create({
        type: "danger",
        text: "Invalid JSON payload",
      });
    }
  });

  return (
    <>
      <InvokeRoot>
        <form onSubmit={onSubmit}>
          <InvokeTextarea
            maxRows={20}
            minRows={5}
            onKeyPress={(e) => {
              if (e.key === "Enter" && e.ctrlKey) onSubmit();
            }}
            {...form.register("json")}
            placeholder="{}"
          />
          <InvokeToolbar>
            <div>Ctrl + Enter to invoke</div>

            <Button
              type="submit"
              style={{ width: 100 }}
              color="highlight"
              disabled={insert.isLoading}
            >
              {insert.isLoading ? (
                <Spinner size="sm" color="accent" />
              ) : (
                "Insert"
              )}
            </Button>
          </InvokeToolbar>
        </form>
      </InvokeRoot>
      {insert.isSuccess && <Status success>Insert success</Status>}
      {insert.isError && <Status error>Error: {insert.error.message}</Status>}
    </>
  );
}
