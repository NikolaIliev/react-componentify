import React, { Component } from "react";

export const LINK_REGEX = new RegExp(
  "((?:https?:\/\/)?(?:[\da-z\.-]+)\.(?:[a-z\.]{2,6})(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)*\/?)(?:\[(.+?)\])?/",
  "g"
);
export const BOLD_REGEX = new RegExp("\\*([\\w\\d\\s\\:\\/\\.\\[\\]]+)\\*", "g");
export const ITALIC_REGEX = new RegExp("\\_([\\w\\d\\s\\:\\/\\.\\[\\]]+)\\_", "g");
export const BR_REGEX = new RegExp("<br\\/>", "g");

export const boldConverter = {
  regex: BOLD_REGEX,
  component: "span",
  props: {
    style: { fontWeight: "900" }
  },
  innerText: matches => matches[1]
};

export const italicConverter = {
  regex: ITALIC_REGEX,
  component: "span",
  props: {
    style: { fontStyle: "italic" }
  },
  innerText: matches => matches[1]
};

export const linkConverter = {
  regex: LINK_REGEX,
  component: "a",
  props: ([_, url]) => {
    return { href: url, targer: "_blank" };
  },
  innerText: matches => matches[2] || matches[1]
};

export const brTagConverter = {
  regex: BR_REGEX,
  component: "br"
};

class Componentify extends Component {
  getPlainTextComponent(text, key) {
    const { plainTextComponent, plainTextStyle } = this.props

    return React.createElement(plainTextComponent, { key, style: plainTextStyle }, text);
  }

  getCurrentConverter(text) {
    const { converters } = this.props;

    return converters.reduce((currtentConverter, converter) => {
      // Clone so mutating doesn't affect client-passed objects
      converter =  {...converter};
      const regex = new RegExp(converter.regex);

      if (!regex) {
        throw new Error("Invalid regex");
      }

      if(!regex.global) {
        throw new Error("Regex missing global flag")
      }

      const currentMatch = regex.exec(text);

      if (currentMatch !== null) {
        converter.match = currentMatch;
        const lowestIndex = currtentConverter && currtentConverter.match.index;
        const currentIndex = converter.match.index;

        if (currtentConverter === null || currentIndex < lowestIndex) {
          currtentConverter = converter;
        }
      }

      return currtentConverter;
    }, null);
  }

  generateComponent(converter, key) {
    const { component, match } = converter;
    let { props = {} } = converter;
    let { innerText } = converter;
    let children = null;

    if (typeof props === "function") {
      props = props(match);
    }

    props.key = key;

    if (typeof innerText === "function") {
      innerText = innerText(match);
    }

    if (typeof innerText !== "undefined") {
      children = this.generateComponentList(innerText, match[0]);
    }

    return React.createElement(component, props, children);
  }

  generateComponentList(text, prevMatch) {
    let str = text;
    let components = [];

    while (str !== "") {
      const currtentConverter = this.getCurrentConverter(str);

      if (!currtentConverter || prevMatch === currtentConverter.match[0]) {
        break;
      }

      const matchIndex = currtentConverter.match.index;
      const textBeforeMatch = str.slice(0, matchIndex);
      const textAfterMatch = str.slice(
        matchIndex + currtentConverter.match[0].length - (currtentConverter.goBack || 0)
      );
      str = textAfterMatch;

      if (textBeforeMatch !== "") {
        components.push(
          this.getPlainTextComponent(
            textBeforeMatch,
            components.length.toString()
          )
        );
      }

      components.push(
        this.generateComponent(currtentConverter, components.length.toString())
      );
    }

    if (str !== "") {
      if (prevMatch !== "") {
        components.push(str);
      } else {
        components.push(
          this.getPlainTextComponent(str, components.length.toString())
        );
      }
    }

    return components;
  }

  render() {
    const { text, converters } = this.props;

    if (!text) {
      throw new Error('Missing property "text"');
    }

    if (!converters) {
      return this.getPlainTextComponent(text);
    }

    return this.generateComponentList(text, "");
  }
}

Componentify.defaultProps = {
    text: "",
    plainTextComponent: "span",
    converters: []
}

export default Componentify;
