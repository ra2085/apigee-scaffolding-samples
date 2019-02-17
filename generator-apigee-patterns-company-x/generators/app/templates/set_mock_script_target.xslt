<xsl:stylesheet version="1.0"
 xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output omit-xml-declaration="yes" indent="yes"/>
  <!--<xsl:strip-space elements="*"/>-->

 <xsl:template match="node()|@*" name="identity">
   <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
   </xsl:copy>
 </xsl:template>

 <xsl:template match="HTTPTargetConnection">
   <ScriptTarget>
           <ResourceURL>node://app.js</ResourceURL>
   </ScriptTarget>
 </xsl:template>
</xsl:stylesheet>